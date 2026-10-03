import { PedidoStatus } from '@prisma/client'

export function isValidStatus(status: unknown): status is PedidoStatus {
  return typeof status === 'string' && (Object.values(PedidoStatus) as string[]).includes(status)
}
