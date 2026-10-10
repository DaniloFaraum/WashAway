import { PedidoStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'

// I17: o lava-rápido vem sempre do token (`req.auth.id`), nunca do navegador.

export function listPedidos(lavaRapidoId: string) {
  return prisma.pedido.findMany({
    where: { lavaRapidoId },
    orderBy: { horario: 'desc' },
  })
}

/** Pedido da empresa, ou `null` se não existir ou for de outra empresa. */
export function getPedidoDaEmpresa(id: string, lavaRapidoId: string) {
  return prisma.pedido.findFirst({ where: { id, lavaRapidoId } })
}

/** Atualiza o status só se o pedido for da empresa; senão devolve `null`. */
export async function updatePedidoStatus(id: string, lavaRapidoId: string, status: PedidoStatus) {
  const { count } = await prisma.pedido.updateMany({ where: { id, lavaRapidoId }, data: { status } })
  if (count === 0) return null
  return prisma.pedido.findUnique({ where: { id } })
}
