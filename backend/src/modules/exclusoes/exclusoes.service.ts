import { StatusSolicitacaoExclusao, type Prisma, type SolicitacaoExclusao } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { enfileirarEmail } from '../email/email.service.js'

// Exclusão de empresa por solicitação (i17-interno-exclusao):
// a empresa solicita (uma pendente por vez), pode cancelar enquanto está
// pendente, e um interno `admin` aprova (exclui o LavaRapido, com a cascata de
// pedidos/serviços/intercorrências/horários) ou recusa. Cada etapa (solicitada,
// aprovada, recusada) enfileira um e-mail para a empresa — quando ela tem
// e-mail (empresas anteriores ao I17 podem não ter).
//
// `nome`/`cnpj`/`email` são snapshot: o registro sobrevive à exclusão
// (`lavaRapidoId` vira null pelo `onDelete: SetNull`).

export const STATUS_SOLICITACAO_EXCLUSAO = Object.values(StatusSolicitacaoExclusao)

// `decididoPorId` (id do interno que decidiu) só sai nas rotas internas: a
// empresa não precisa dele.
const OMIT_DA_EMPRESA = { decididoPorId: true } as const

/** Solicitação como a empresa vê (sem `decididoPorId`). */
export type SolicitacaoDaEmpresa = Omit<SolicitacaoExclusao, 'decididoPorId'>

const NOME_PRODUTO = 'Wash Your Way'

type EmailDaSolicitacao = Pick<SolicitacaoExclusao, 'nome' | 'cnpj' | 'email' | 'motivo' | 'observacao'>

async function enfileirarEmailDaEtapa(
  tx: Prisma.TransactionClient,
  tipo: 'exclusao_solicitada' | 'exclusao_aprovada' | 'exclusao_recusada',
  solicitacao: EmailDaSolicitacao,
) {
  if (!solicitacao.email) return
  const textos = {
    exclusao_solicitada: {
      assunto: `${NOME_PRODUTO}: recebemos o pedido de exclusão da sua empresa`,
      corpo: [
        `Olá, ${solicitacao.nome}.`,
        '',
        `Recebemos o pedido de exclusão da empresa (CNPJ ${solicitacao.cnpj}) do ${NOME_PRODUTO}.`,
        solicitacao.motivo ? `Motivo informado: ${solicitacao.motivo}` : null,
        'A equipe vai analisar o pedido. Enquanto ele estiver pendente, você pode cancelá-lo no painel, em "Minha empresa".',
      ],
    },
    exclusao_aprovada: {
      assunto: `${NOME_PRODUTO}: sua empresa foi excluída`,
      corpo: [
        `Olá, ${solicitacao.nome}.`,
        '',
        `O pedido de exclusão da empresa (CNPJ ${solicitacao.cnpj}) foi aprovado. A empresa e os dados dela (pedidos, serviços e disponibilidade) foram excluídos do ${NOME_PRODUTO}.`,
      ],
    },
    exclusao_recusada: {
      assunto: `${NOME_PRODUTO}: pedido de exclusão recusado`,
      corpo: [
        `Olá, ${solicitacao.nome}.`,
        '',
        `O pedido de exclusão da empresa (CNPJ ${solicitacao.cnpj}) foi recusado. A empresa continua ativa no ${NOME_PRODUTO}.`,
        solicitacao.observacao ? `Observação da equipe: ${solicitacao.observacao}` : null,
      ],
    },
  }[tipo]

  await enfileirarEmail(tx, {
    tipo,
    destinatario: solicitacao.email,
    assunto: textos.assunto,
    corpo: textos.corpo.filter((linha) => linha !== null).join('\n'),
  })
}

export type SolicitarExclusaoResultado =
  | { tipo: 'empresa_inexistente' }
  | { tipo: 'existente'; solicitacao: SolicitacaoDaEmpresa }
  | { tipo: 'criada'; solicitacao: SolicitacaoDaEmpresa }

/**
 * Cria a solicitação pendente da empresa, ou devolve a que já existe. A linha
 * do LavaRapido fica travada na transação (`FOR UPDATE`), então duas
 * requisições ao mesmo tempo não criam duas pendentes.
 */
export function solicitarExclusao(lavaRapidoId: string, motivo: string | null): Promise<SolicitarExclusaoResultado> {
  return prisma.$transaction(async (tx) => {
    const travada = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "LavaRapido" WHERE id = ${lavaRapidoId} FOR UPDATE`
    if (travada.length === 0) return { tipo: 'empresa_inexistente' }

    const pendente = await tx.solicitacaoExclusao.findFirst({
      where: { lavaRapidoId, status: 'pendente' },
      omit: OMIT_DA_EMPRESA,
    })
    if (pendente) return { tipo: 'existente', solicitacao: pendente }

    const empresa = await tx.lavaRapido.findUniqueOrThrow({
      where: { id: lavaRapidoId },
      select: { name: true, cnpj: true, email: true },
    })
    const solicitacao = await tx.solicitacaoExclusao.create({
      data: { lavaRapidoId, nome: empresa.name, cnpj: empresa.cnpj, email: empresa.email, motivo },
      omit: OMIT_DA_EMPRESA,
    })
    await enfileirarEmailDaEtapa(tx, 'exclusao_solicitada', solicitacao)
    return { tipo: 'criada', solicitacao }
  })
}

/** A empresa do token ainda existe? (token de empresa excluída continua válido até expirar) */
export async function empresaExiste(lavaRapidoId: string): Promise<boolean> {
  return (await prisma.lavaRapido.count({ where: { id: lavaRapidoId } })) > 0
}

/** Solicitação mais recente da empresa (qualquer status), ou `null` se nunca houve. */
export function getSolicitacaoDaEmpresa(lavaRapidoId: string) {
  return prisma.solicitacaoExclusao.findFirst({
    where: { lavaRapidoId },
    orderBy: { criadoEm: 'desc' },
    omit: OMIT_DA_EMPRESA,
  })
}

/** Cancela a pendente da empresa. `null` se não houver pendente. */
export async function cancelarSolicitacaoDaEmpresa(lavaRapidoId: string) {
  return prisma.$transaction(async (tx) => {
    const pendente = await tx.solicitacaoExclusao.findFirst({ where: { lavaRapidoId, status: 'pendente' } })
    if (!pendente) return null
    const { count } = await tx.solicitacaoExclusao.updateMany({
      where: { id: pendente.id, status: 'pendente' },
      data: { status: 'cancelada', decididoEm: new Date() },
    })
    if (count === 0) return null
    return tx.solicitacaoExclusao.findUniqueOrThrow({ where: { id: pendente.id }, omit: OMIT_DA_EMPRESA })
  })
}

/** Lista para a equipe interna, mais antigas primeiro (fila de análise). */
export function listarSolicitacoes(status?: StatusSolicitacaoExclusao) {
  return prisma.solicitacaoExclusao.findMany({
    where: status ? { status } : {},
    orderBy: { criadoEm: 'asc' },
  })
}

export type DecisaoResultado =
  | { tipo: 'nao_encontrada' }
  | { tipo: 'ja_decidida'; solicitacao: SolicitacaoExclusao }
  | { tipo: 'ok'; solicitacao: SolicitacaoExclusao }

/**
 * Muda o status de `pendente` para o da decisão, só se ainda estiver pendente
 * (`updateMany` condicional): decisão dupla ou concorrente vira `ja_decidida`.
 */
async function decidir(
  tx: Prisma.TransactionClient,
  id: string,
  internoId: string,
  status: 'aprovada' | 'recusada',
  observacao: string | null,
): Promise<DecisaoResultado> {
  const atual = await tx.solicitacaoExclusao.findUnique({ where: { id } })
  if (!atual) return { tipo: 'nao_encontrada' }

  const { count } = await tx.solicitacaoExclusao.updateMany({
    where: { id, status: 'pendente' },
    data: { status, decididoEm: new Date(), decididoPorId: internoId, observacao },
  })
  // Relê: numa decisão concorrente, `atual` ainda diria `pendente`.
  if (count === 0) {
    return { tipo: 'ja_decidida', solicitacao: await tx.solicitacaoExclusao.findUniqueOrThrow({ where: { id } }) }
  }

  return { tipo: 'ok', solicitacao: await tx.solicitacaoExclusao.findUniqueOrThrow({ where: { id } }) }
}

/**
 * Aprova: marca `aprovada`, enfileira `exclusao_aprovada` e exclui o
 * LavaRapido (cascata) — tudo na mesma transação.
 */
export function aprovarSolicitacao(id: string, internoId: string): Promise<DecisaoResultado> {
  return prisma.$transaction(async (tx) => {
    const resultado = await decidir(tx, id, internoId, 'aprovada', null)
    if (resultado.tipo !== 'ok') return resultado

    const { lavaRapidoId } = resultado.solicitacao
    await enfileirarEmailDaEtapa(tx, 'exclusao_aprovada', resultado.solicitacao)
    if (lavaRapidoId) {
      // Pode já não existir (excluída por outro caminho): deleteMany não lança.
      await tx.lavaRapido.deleteMany({ where: { id: lavaRapidoId } })
    }
    // Depois da exclusão, `lavaRapidoId` já é null (SetNull).
    return { tipo: 'ok', solicitacao: await tx.solicitacaoExclusao.findUniqueOrThrow({ where: { id } }) }
  })
}

/** Recusa: grava a observação e enfileira `exclusao_recusada`. A empresa continua. */
export function recusarSolicitacao(id: string, internoId: string, observacao: string | null): Promise<DecisaoResultado> {
  return prisma.$transaction(async (tx) => {
    const resultado = await decidir(tx, id, internoId, 'recusada', observacao)
    if (resultado.tipo === 'ok') await enfileirarEmailDaEtapa(tx, 'exclusao_recusada', resultado.solicitacao)
    return resultado
  })
}
