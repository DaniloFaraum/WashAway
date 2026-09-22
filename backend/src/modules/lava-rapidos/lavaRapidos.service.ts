import { prisma } from '../../config/prisma.js'

export function listLavaRapidos() {
  return prisma.lavaRapido.findMany()
}

export function getLavaRapidoById(id: string) {
  return prisma.lavaRapido.findUnique({ where: { id } })
}
