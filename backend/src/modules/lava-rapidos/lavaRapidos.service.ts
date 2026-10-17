import type { Prisma } from '@prisma/client'
import { conferirSenha } from '../../auth/senha.js'
import { assinarToken, expiracaoDoToken } from '../../auth/token.js'
import { prisma } from '../../config/prisma.js'
import { estaAberto, listarAbertos } from '../horarios/disponibilidade.service.js'
import { listarHorarios } from '../horarios/horarios.service.js'
import { getIntercorrenciaAtiva } from '../intercorrencias/intercorrencias.service.js'
import { ESCOPO_TROCAR_SENHA, VALIDADE_TOKEN_TROCAR_SENHA } from './senhas.service.js'

// I17: não há mais senha fixa "admin" — a empresa define a própria senha no
// onboarding (`SolicitacaoOnboarding.senhaHash`).

/** Sem a senha e sem a senha gerada (i17-senha-gerada) — nenhum hash sai da API. */
export function omitSenha<T extends { senha: string; senhaGerada: string | null }>(lavaRapido: T): Omit<T, 'senha' | 'senhaGerada'> {
  const { senha: _senha, senhaGerada: _senhaGerada, ...resto } = lavaRapido
  return resto
}

/** Dados das rotas públicas (listagem/busca): sem senhas e sem o e-mail de acesso. */
export function dadosPublicos<T extends { senha: string; senhaGerada: string | null; email: string | null }>(
  lavaRapido: T,
): Omit<T, 'senha' | 'senhaGerada' | 'email'> {
  const { senha: _senha, senhaGerada: _senhaGerada, email: _email, ...resto } = lavaRapido
  return resto
}

// "A partir de": menor preço entre os serviços ativos de cada lava-rápido, numa
// query agregada só. Substitui a coluna `LavaRapido.price` (fixa no seed, 0 em
// empresa nova) no que a API devolve; sem serviço ativo, `price` vem `null`.
async function getPrecosAPartirDe(lavaRapidoIds?: string[]) {
  const grupos = await prisma.servico.groupBy({
    by: ['lavaRapidoId'],
    where: { ativo: true, ...(lavaRapidoIds ? { lavaRapidoId: { in: lavaRapidoIds } } : {}) },
    _min: { preco: true },
  })
  return new Map(grupos.map((grupo) => [grupo.lavaRapidoId, grupo._min.preco]))
}

// `isOpen` = coluna `isOpen` E `estaAberto(agora)` — horário de funcionamento
// (I19) e intercorrências, pela função compartilhada de disponibilidade.
//
// Busca por horário (I9): com `horario`, devolve só quem está aberto naquele
// instante pela mesma regra (coluna `isOpen` E `listarAbertos(ids, horario)`).
// O `isOpen` da resposta continua sendo "aberto agora".
export async function listLavaRapidos(horario?: Date) {
  const [lavaRapidos, precos] = await Promise.all([prisma.lavaRapido.findMany(), getPrecosAPartirDe()])
  const ids = lavaRapidos.map((lavaRapido) => lavaRapido.id)
  const [disponibilidades, disponibilidadesNoHorario] = await Promise.all([
    listarAbertos(ids, new Date()),
    horario ? listarAbertos(ids, horario) : null,
  ])

  const visiveis = disponibilidadesNoHorario
    ? lavaRapidos.filter(
        (lavaRapido) => lavaRapido.isOpen && (disponibilidadesNoHorario.get(lavaRapido.id)?.aberto ?? true),
      )
    : lavaRapidos

  return visiveis.map((lavaRapido) => ({
    ...lavaRapido,
    price: precos.get(lavaRapido.id) ?? null,
    isOpen: lavaRapido.isOpen && (disponibilidades.get(lavaRapido.id)?.aberto ?? true),
  }))
}

export async function getLavaRapidoById(id: string) {
  const lavaRapido = await prisma.lavaRapido.findUnique({ where: { id } })
  if (!lavaRapido) return null

  const agora = new Date()
  const [disponibilidade, intercorrenciaAtiva, horarios, precos] = await Promise.all([
    estaAberto(id, agora),
    getIntercorrenciaAtiva(id, agora),
    listarHorarios(id),
    getPrecosAPartirDe([id]),
  ])

  return {
    ...lavaRapido,
    price: precos.get(id) ?? null,
    isOpen: lavaRapido.isOpen && disponibilidade.aberto,
    // O painel usa `intercorrenciaAtiva` para o botão "Reabrir" e `foraDoHorario`
    // para explicar por que está fechado.
    intercorrenciaAtiva,
    foraDoHorario: !disponibilidade.aberto && disponibilidade.motivo.tipo === 'fora_do_horario',
    horarios,
  }
}

export function getLavaRapidoByCnpj(cnpj: string) {
  return prisma.lavaRapido.findUnique({ where: { cnpj } })
}

export type CriarLavaRapidoInput = {
  name: string
  address?: string
  cnpj: string
  /** E-mail de acesso, já normalizado. */
  email: string
  /** Hash bcrypt da senha escolhida no onboarding. */
  senhaHash: string
}

// `client` permite rodar dentro de uma transação (aceite do onboarding cria a
// empresa e conclui a solicitação de forma atômica).
export async function criarLavaRapido(
  { name, address, cnpj, email, senhaHash }: CriarLavaRapidoInput,
  client: Prisma.TransactionClient = prisma,
) {
  return client.lavaRapido.create({
    data: {
      name,
      address,
      cnpj,
      email,
      senha: senhaHash,
      rating: 0,
      reviewsCount: 0,
      distance: '',
      time: '',
      price: 0,
      isOpen: true,
      image: `https://placehold.co/300x300?text=${encodeURIComponent(name)}`,
      latitude: 0,
      longitude: 0,
    },
  })
}

/**
 * Login do painel (i17-senha-gerada):
 * - senha própria → `modo: 'normal'` (e a senha gerada, se havia, é zerada);
 * - senha gerada → `modo: 'trocarSenha'` (só pode definir a senha nova);
 * - senão `null` (CNPJ inexistente ou senha errada — CNPJ inexistente gasta o
 *   mesmo tempo de um `bcrypt.compare`).
 */
export async function autenticarLavaRapido(cnpj: string, senha: string) {
  const lavaRapido = await getLavaRapidoByCnpj(cnpj)

  if (await conferirSenha(senha, lavaRapido?.senha)) {
    if (lavaRapido!.senhaGerada) {
      // Condicional ao hash lido: um "esqueci" concorrente que acabou de gerar
      // uma senha nova (e mandou por e-mail) não é apagado.
      await prisma.lavaRapido.updateMany({
        where: { id: lavaRapido!.id, senhaGerada: lavaRapido!.senhaGerada },
        data: { senhaGerada: null },
      })
    }
    return { lavaRapido: lavaRapido!, modo: 'normal' as const }
  }
  // Sempre a segunda conferência (hash fictício sem senha gerada): toda falha
  // custa o mesmo, e o tempo não revela quem tem senha gerada pendente.
  if (await conferirSenha(senha, lavaRapido?.senhaGerada)) {
    return { lavaRapido: lavaRapido!, modo: 'trocarSenha' as const }
  }
  return null
}

export function getLavaRapidoByEmail(email: string) {
  return prisma.lavaRapido.findUnique({ where: { email } })
}

/**
 * Resposta de sessão do painel (login, aceite do contrato e troca de senha):
 * token de lava-rápido + a empresa como `GET /lavaRapidos/:id` devolve (com
 * horários e disponibilidade), sem a senha. Com `trocaDeSenhaObrigatoria`
 * (login com a senha gerada), o token é de escopo `trocar-senha` e validade
 * curta — só serve para `POST /auth/lava-rapido/trocar-senha`.
 */
export async function sessaoDoLavaRapido(id: string, { trocaDeSenhaObrigatoria = false } = {}) {
  const lavaRapido = await getLavaRapidoById(id)
  if (!lavaRapido) throw new Error(`Lava-rápido ${id} não encontrado ao abrir a sessão`)
  const token = trocaDeSenhaObrigatoria
    ? assinarToken({ id, tipo: 'lavaRapido', escopo: ESCOPO_TROCAR_SENHA, validade: VALIDADE_TOKEN_TROCAR_SENHA })
    : assinarToken({ id, tipo: 'lavaRapido' })
  return { token, expiraEm: expiracaoDoToken(token), trocaDeSenhaObrigatoria, lavaRapido: omitSenha(lavaRapido) }
}

/** Consulta leve: a empresa ainda existe? (token de empresa já excluída não vale) */
export async function existeLavaRapido(id: string) {
  return (await prisma.lavaRapido.count({ where: { id } })) > 0
}
