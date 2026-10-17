import { conferirSenha, gerarHashSenha } from '../../auth/senha.js'
import { prisma } from '../../config/prisma.js'
import { criarLavaRapido, getLavaRapidoByCnpj, getLavaRapidoByEmail } from '../lava-rapidos/lavaRapidos.service.js'
import { definirSenhaGerada } from '../lava-rapidos/senhas.service.js'
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
  | { tipo: 'solicitacao_em_andamento' }
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

  // Já existe solicitação pendente para o CNPJ: nunca duplica.
  // - Com e-mail e senha (I17): só o próprio dono retoma (mesmo e-mail e mesma
  //   senha) — senão `409`. Sobrescrever as credenciais deixaria qualquer um
  //   que conheça o CNPJ (dado público) trocar a senha da empresa em cadastro.
  // - Sem senha (anterior ao I17): o reenvio completa a mesma solicitação.
  const pendente = await prisma.solicitacaoOnboarding.findFirst({
    where: { cnpj, status: 'aguardando_contrato' },
    select: { id: true, email: true, senhaHash: true },
  })
  if (pendente) {
    if (pendente.senhaHash) {
      const senhaConfere = await conferirSenha(senha, pendente.senhaHash)
      if (!senhaConfere || pendente.email !== email) return { tipo: 'solicitacao_em_andamento' }
    }
    const solicitacao = await prisma.solicitacaoOnboarding.update({
      where: { id: pendente.id },
      data: pendente.senhaHash
        ? { name, address }
        : { name, address, email, senhaHash: await gerarHashSenha(senha) },
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
    data: { name, address, cnpj, email, senhaHash: await gerarHashSenha(senha), contratoId: contrato.id },
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
    // i17-senha-gerada: além da senha própria, a empresa recebe por e-mail uma
    // senha temporária (entrar com ela leva à troca obrigatória).
    await definirSenhaGerada(tx, lavaRapido, 'onboarding')
    return { tipo: 'aceita', lavaRapido }
  })
}
