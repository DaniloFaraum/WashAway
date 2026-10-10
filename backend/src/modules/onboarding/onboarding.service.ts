import bcrypt from 'bcryptjs'
import { prisma } from '../../config/prisma.js'
import {
  criarLavaRapido,
  CUSTO_BCRYPT_LAVA_RAPIDO,
  getLavaRapidoByCnpj,
  getLavaRapidoByEmail,
} from '../lava-rapidos/lavaRapidos.service.js'
import { getContratoVigente } from '../contratos/contratos.service.js'

const INCLUDE_CONTRATO = {
  contrato: { select: { id: true, versao: true, titulo: true, conteudo: true } },
} as const

// O hash da senha nunca sai da API.
const OMIT_SENHA = { senhaHash: true } as const

export type SolicitarInput = {
  name: string
  address?: string
  cnpj: string
  /** Já normalizado (trim + minúsculas). */
  email: string
  /** Senha em texto puro (já validada); gravada só como hash bcrypt. */
  senha: string
}

export type SolicitarResultado =
  | { tipo: 'criada'; solicitacao: Awaited<ReturnType<typeof getSolicitacaoById>> }
  | { tipo: 'existente'; solicitacao: Awaited<ReturnType<typeof getSolicitacaoById>> }
  | { tipo: 'cnpj_ja_cadastrado' }
  | { tipo: 'email_ja_cadastrado' }
  | { tipo: 'sem_contrato_vigente' }

export function getSolicitacaoById(id: string) {
  return prisma.solicitacaoOnboarding.findUnique({ where: { id }, include: INCLUDE_CONTRATO, omit: OMIT_SENHA })
}

// "Valida empresa" do diagrama: nesta versão é só duplicidade de CNPJ/e-mail,
// com aprovação automática — passou, já nasce `aguardando_contrato`.
export async function solicitar({ name, address, cnpj, email, senha }: SolicitarInput): Promise<SolicitarResultado> {
  if (await getLavaRapidoByCnpj(cnpj)) {
    return { tipo: 'cnpj_ja_cadastrado' }
  }
  if (await getLavaRapidoByEmail(email)) {
    return { tipo: 'email_ja_cadastrado' }
  }

  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT_LAVA_RAPIDO)

  // Já existe solicitação pendente para o CNPJ: devolve a mesma (sem duplicar),
  // atualizando com os dados enviados agora — vale o último envio até o aceite
  // (e é o que conserta solicitações antigas, de antes da senha própria).
  const pendente = await prisma.solicitacaoOnboarding.findFirst({
    where: { cnpj, status: 'aguardando_contrato' },
    select: { id: true },
  })
  if (pendente) {
    const solicitacao = await prisma.solicitacaoOnboarding.update({
      where: { id: pendente.id },
      data: { name, address, email, senhaHash },
      include: INCLUDE_CONTRATO,
      omit: OMIT_SENHA,
    })
    return { tipo: 'existente', solicitacao }
  }

  const contrato = await getContratoVigente()
  if (!contrato) {
    return { tipo: 'sem_contrato_vigente' }
  }

  const solicitacao = await prisma.solicitacaoOnboarding.create({
    data: { name, address, cnpj, email, senhaHash, contratoId: contrato.id },
    include: INCLUDE_CONTRATO,
    omit: OMIT_SENHA,
  })
  return { tipo: 'criada', solicitacao }
}

export type AceitarResultado =
  | { tipo: 'aceita'; lavaRapido: Awaited<ReturnType<typeof criarLavaRapido>> }
  | { tipo: 'nao_encontrada' }
  | { tipo: 'ja_concluida' }
  | { tipo: 'sem_senha' }

export async function aceitarContrato(id: string): Promise<AceitarResultado> {
  return prisma.$transaction(async (tx) => {
    const solicitacao = await tx.solicitacaoOnboarding.findUnique({ where: { id } })
    if (!solicitacao) return { tipo: 'nao_encontrada' }
    if (solicitacao.status === 'concluida') return { tipo: 'ja_concluida' }
    // Solicitação anterior ao I17 (sem e-mail/senha): não cria empresa com senha
    // fixa — quem cadastrou envia o formulário de novo (atualiza a pendente).
    if (!solicitacao.email || !solicitacao.senhaHash) return { tipo: 'sem_senha' }

    const lavaRapido = await criarLavaRapido(
      {
        name: solicitacao.name,
        address: solicitacao.address ?? undefined,
        cnpj: solicitacao.cnpj,
        email: solicitacao.email,
        senhaHash: solicitacao.senhaHash,
      },
      tx,
    )
    await tx.solicitacaoOnboarding.update({
      where: { id },
      data: { status: 'concluida', aceitoEm: new Date(), lavaRapidoId: lavaRapido.id },
    })
    return { tipo: 'aceita', lavaRapido }
  })
}
