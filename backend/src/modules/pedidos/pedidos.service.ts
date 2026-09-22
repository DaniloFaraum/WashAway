import { PedidoStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'

export function listPedidos() {
  return prisma.pedido.findMany({ orderBy: { horario: 'desc' } })
}

export function getPedidoById(id: string) {
  return prisma.pedido.findUnique({ where: { id } })
}

export function updatePedidoStatus(id: string, status: PedidoStatus) {
  return prisma.pedido.update({ where: { id }, data: { status } })
}

export function isValidStatus(status: unknown): status is PedidoStatus {
  return typeof status === 'string' && (Object.values(PedidoStatus) as string[]).includes(status)
}
