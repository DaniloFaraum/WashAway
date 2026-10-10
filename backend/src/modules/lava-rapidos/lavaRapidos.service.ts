import type { Prisma } from '@prisma/client'
import { conferirSenha } from '../../auth/senha.js'
import { assinarToken, expiracaoDoToken } from '../../auth/token.js'
import { prisma } from '../../config/prisma.js'
import { estaAberto, listarAbertos } from '../horarios/disponibilidade.service.js'
import { listarHorarios } from '../horarios/horarios.service.js'
import { getIntercorrenciaAtiva } from '../intercorrencias/intercorrencias.service.js'

// I17: não há mais senha fixa "admin" — a empresa define a própria senha no
// onboarding (`SolicitacaoOnboarding.senhaHash`).

export function omitSenha<T extends { senha: string }>(lavaRapido: T): Omit<T, 'senha'> {
  const { senha: _senha, ...resto } = lavaRapido
  return resto
}

/** Dados das rotas públicas (listagem/busca): sem senha e sem o e-mail de acesso. */
export function dadosPublicos<T extends { senha: string; email: string | null }>(lavaRapido: T): Omit<T, 'senha' | 'email'> {
  const { senha: _senha, email: _email, ...resto } = lavaRapido
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
export async function listLavaRapidos() {
  const [lavaRapidos, precos] = await Promise.all([prisma.lavaRapido.findMany(), getPrecosAPartirDe()])
  const disponibilidades = await listarAbertos(
    lavaRapidos.map((lavaRapido) => lavaRapido.id),
    new Date(),
  )

  return lavaRapidos.map((lavaRapido) => ({
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

/** Empresa dona das credenciais, ou `null` (CNPJ inexistente ou senha errada — no mesmo tempo). */
export async function autenticarLavaRapido(cnpj: string, senha: string) {
  const lavaRapido = await getLavaRapidoByCnpj(cnpj)
  return (await conferirSenha(senha, lavaRapido?.senha)) ? lavaRapido : null
}

export function getLavaRapidoByEmail(email: string) {
  return prisma.lavaRapido.findUnique({ where: { email } })
}

/**
 * Resposta de sessão do painel (login e aceite do contrato): token de
 * lava-rápido + a empresa como `GET /lavaRapidos/:id` devolve (com horários e
 * disponibilidade), sem a senha.
 */
export async function sessaoDoLavaRapido(id: string) {
  const lavaRapido = await getLavaRapidoById(id)
  if (!lavaRapido) throw new Error(`Lava-rápido ${id} não encontrado ao abrir a sessão`)
  const token = assinarToken({ id, tipo: 'lavaRapido' })
  return { token, expiraEm: expiracaoDoToken(token), lavaRapido: omitSenha(lavaRapido) }
}

/** Consulta leve: a empresa ainda existe? (token de empresa já excluída não vale) */
export async function existeLavaRapido(id: string) {
  return (await prisma.lavaRapido.count({ where: { id } })) > 0
}
