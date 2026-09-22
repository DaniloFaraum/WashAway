import { PedidoStatus, Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'

export function listPedidos() {
  return prisma.pedido.findMany({ orderBy: { horario: 'desc' } })
}

export function updatePedidoStatus(id: string, status: PedidoStatus) {
  return prisma.pedido.update({ where: { id }, data: { status } })
}

export function isValidStatus(status: unknown): status is PedidoStatus {
  return typeof status === 'string' && (Object.values(PedidoStatus) as string[]).includes(status)
}

export function isPedidoNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}
