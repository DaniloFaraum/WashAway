import { prisma } from '../../config/prisma.js'
import { criarLavaRapido, getLavaRapidoByCnpj } from '../lava-rapidos/lavaRapidos.service.js'
import { getContratoVigente } from '../contratos/contratos.service.js'

const INCLUDE_CONTRATO = {
  contrato: { select: { id: true, versao: true, titulo: true, conteudo: true } },
} as const

export type SolicitarInput = {
  name: string
  address?: string
  cnpj: string
}

export type SolicitarResultado =
  | { tipo: 'criada'; solicitacao: Awaited<ReturnType<typeof getSolicitacaoById>> }
  | { tipo: 'existente'; solicitacao: Awaited<ReturnType<typeof getSolicitacaoById>> }
  | { tipo: 'cnpj_ja_cadastrado' }
  | { tipo: 'sem_contrato_vigente' }

export function getSolicitacaoById(id: string) {
  return prisma.solicitacaoOnboarding.findUnique({ where: { id }, include: INCLUDE_CONTRATO })
}

// "Valida empresa" do diagrama: nesta versão é só duplicidade de CNPJ, com
// aprovação automática — passou, já nasce `aguardando_contrato`.
export async function solicitar({ name, address, cnpj }: SolicitarInput): Promise<SolicitarResultado> {
  if (await getLavaRapidoByCnpj(cnpj)) {
    return { tipo: 'cnpj_ja_cadastrado' }
  }

  const pendente = await prisma.solicitacaoOnboarding.findFirst({
    where: { cnpj, status: 'aguardando_contrato' },
    include: INCLUDE_CONTRATO,
  })
  if (pendente) {
    return { tipo: 'existente', solicitacao: pendente }
  }

  const contrato = await getContratoVigente()
  if (!contrato) {
    return { tipo: 'sem_contrato_vigente' }
  }

  const solicitacao = await prisma.solicitacaoOnboarding.create({
    data: { name, address, cnpj, contratoId: contrato.id },
    include: INCLUDE_CONTRATO,
  })
  return { tipo: 'criada', solicitacao }
}

export type AceitarResultado =
  | { tipo: 'aceita'; lavaRapido: Awaited<ReturnType<typeof criarLavaRapido>> }
  | { tipo: 'nao_encontrada' }
  | { tipo: 'ja_concluida' }

export async function aceitarContrato(id: string): Promise<AceitarResultado> {
  return prisma.$transaction(async (tx) => {
    const solicitacao = await tx.solicitacaoOnboarding.findUnique({ where: { id } })
    if (!solicitacao) return { tipo: 'nao_encontrada' }
    if (solicitacao.status === 'concluida') return { tipo: 'ja_concluida' }

    const lavaRapido = await criarLavaRapido(
      { name: solicitacao.name, address: solicitacao.address ?? undefined, cnpj: solicitacao.cnpj },
      tx,
    )
    await tx.solicitacaoOnboarding.update({
      where: { id },
      data: { status: 'concluida', aceitoEm: new Date(), lavaRapidoId: lavaRapido.id },
    })
    return { tipo: 'aceita', lavaRapido }
  })
}
