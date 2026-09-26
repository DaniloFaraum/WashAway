import bcrypt from 'bcryptjs'
import { prisma } from '../../config/prisma.js'

export const SENHA_PADRAO = 'admin'

export function omitSenha<T extends { senha: string }>(lavaRapido: T): Omit<T, 'senha'> {
  const { senha: _senha, ...resto } = lavaRapido
  return resto
}

export function listLavaRapidos() {
  return prisma.lavaRapido.findMany()
}

export function getLavaRapidoById(id: string) {
  return prisma.lavaRapido.findUnique({ where: { id } })
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
