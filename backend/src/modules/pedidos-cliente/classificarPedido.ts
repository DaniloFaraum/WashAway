import type { PedidoStatus } from '@prisma/client'

// I18: em qual lista do app ("Próximos" ou "Anteriores") o pedido entra.
// Regra pura (sem banco), testada em classificarPedido.unit.test.ts.

export type QuandoPedido = 'proximo' | 'anterior'

/** Status que encerram o pedido: mesmo com horário no futuro, ele já é "anterior". */
const STATUS_ENCERRADOS: readonly PedidoStatus[] = ['recusado', 'concluido']

/** `proximo` se o horário ainda não passou (`horario >= agora`) e o pedido não foi recusado nem concluído; senão `anterior`. */
export function classificarPedido(pedido: { horario: Date; status: PedidoStatus }, agora: Date): QuandoPedido {
  if (STATUS_ENCERRADOS.includes(pedido.status)) return 'anterior'
  return pedido.horario.getTime() >= agora.getTime() ? 'proximo' : 'anterior'
}
