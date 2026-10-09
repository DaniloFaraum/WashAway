import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { estaAberto, listarAbertos } from '../horarios/disponibilidade.service.js'
import { listarHorarios } from '../horarios/horarios.service.js'
import { getIntercorrenciaAtiva } from '../intercorrencias/intercorrencias.service.js'

export const SENHA_PADRAO = 'admin'

export function omitSenha<T extends { senha: string }>(lavaRapido: T): Omit<T, 'senha'> {
  const { senha: _senha, ...resto } = lavaRapido
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

export function deleteLavaRapido(id: string) {
  return prisma.lavaRapido.delete({ where: { id } })
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
}

// `client` permite rodar dentro de uma transação (aceite do onboarding cria a
// empresa e conclui a solicitação de forma atômica).
export async function criarLavaRapido(
  { name, address, cnpj }: CriarLavaRapidoInput,
  client: Prisma.TransactionClient = prisma,
) {
  const senha = await bcrypt.hash(SENHA_PADRAO, 10)

  return client.lavaRapido.create({
    data: {
      name,
      address,
      cnpj,
      senha,
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

export async function autenticarLavaRapido(cnpj: string, senha: string) {
  const lavaRapido = await getLavaRapidoByCnpj(cnpj)
  if (!lavaRapido) {
    return null
  }

  const senhaValida = await bcrypt.compare(senha, lavaRapido.senha)
  if (!senhaValida) {
    return null
  }

  return lavaRapido
}
