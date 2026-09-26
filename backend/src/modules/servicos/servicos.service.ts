import { prisma } from '../../config/prisma.js'

export function listServicos(lavaRapidoId?: string) {
  return prisma.servico.findMany({
    where: lavaRapidoId ? { lavaRapidoId } : undefined,
  })
}

export function getServicoById(id: string) {
  return prisma.servico.findUnique({ where: { id } })
}

export function updateServicoAtivo(id: string, ativo: boolean) {
  return prisma.servico.update({ where: { id }, data: { ativo } })
}
