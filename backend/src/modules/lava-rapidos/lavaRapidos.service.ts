import bcrypt from 'bcryptjs'
import { prisma } from '../../config/prisma.js'
import { getIntercorrenciaAtiva, listLavaRapidoIdsComIntercorrenciaAtiva } from '../intercorrencias/intercorrencias.service.js'

export const SENHA_PADRAO = 'admin'

export function omitSenha<T extends { senha: string }>(lavaRapido: T): Omit<T, 'senha'> {
  const { senha: _senha, ...resto } = lavaRapido
  return resto
}

export async function listLavaRapidos() {
  const [lavaRapidos, intercorrenciasAtivas] = await Promise.all([
    prisma.lavaRapido.findMany(),
    listLavaRapidoIdsComIntercorrenciaAtiva(new Date()),
  ])

  return lavaRapidos.map((lavaRapido) => ({
    ...lavaRapido,
    isOpen: lavaRapido.isOpen && !intercorrenciasAtivas.has(lavaRapido.id),
  }))
}

export function deleteLavaRapido(id: string) {
  return prisma.lavaRapido.delete({ where: { id } })
}

export async function getLavaRapidoById(id: string) {
  const lavaRapido = await prisma.lavaRapido.findUnique({ where: { id } })
  if (!lavaRapido) return null

  const intercorrenciaAtiva = await getIntercorrenciaAtiva(id, new Date())

  return {
    ...lavaRapido,
    isOpen: lavaRapido.isOpen && !intercorrenciaAtiva,
    intercorrenciaAtiva,
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

export async function criarLavaRapido({ name, address, cnpj }: CriarLavaRapidoInput) {
  const senha = await bcrypt.hash(SENHA_PADRAO, 10)

  return prisma.lavaRapido.create({
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
