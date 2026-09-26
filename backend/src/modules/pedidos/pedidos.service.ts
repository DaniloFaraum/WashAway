import { PedidoStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'

export function listPedidos(lavaRapidoId?: string) {
  return prisma.pedido.findMany({
    where: lavaRapidoId ? { lavaRapidoId } : undefined,
    orderBy: { horario: 'desc' },
  })
}

export function getPedidoById(id: string) {
  return prisma.pedido.findUnique({ where: { id } })
}

export function updatePedidoStatus(id: string, status: PedidoStatus) {
  return prisma.pedido.update({ where: { id }, data: { status } })
}
