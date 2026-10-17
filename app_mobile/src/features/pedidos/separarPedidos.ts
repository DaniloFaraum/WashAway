import type { PedidoCliente } from './service/pedidos.model'

// I18: as três listas de "Meus pedidos". A regra de tempo (próximo/anterior)
// vem do backend em `quando`; aqui só tiramos os recusados para a lista própria
// e ordenamos cada lista.

export interface PedidosSeparados {
  /** Horário mais próximo primeiro. */
  proximos: PedidoCliente[]
  /** Mais recente primeiro. */
  anteriores: PedidoCliente[]
  /** Recusa mais recente primeiro (pela data da recusa; sem ela, pelo horário). */
  recusados: PedidoCliente[]
}

const instante = (iso: string | null) => {
  const ms = iso ? new Date(iso).getTime() : Number.NaN
  return Number.isNaN(ms) ? 0 : ms
}

export function separarPedidos(pedidos: readonly PedidoCliente[]): PedidosSeparados {
  const proximos: PedidoCliente[] = []
  const anteriores: PedidoCliente[] = []
  const recusados: PedidoCliente[] = []
  for (const pedido of pedidos) {
    if (pedido.status === 'recusado') recusados.push(pedido)
    else if (pedido.quando === 'proximo') proximos.push(pedido)
    else anteriores.push(pedido)
  }
  proximos.sort((a, b) => instante(a.horario) - instante(b.horario))
  anteriores.sort((a, b) => instante(b.horario) - instante(a.horario))
  recusados.sort((a, b) => instante(b.statusAlteradoEm ?? b.horario) - instante(a.statusAlteradoEm ?? a.horario))
  return { proximos, anteriores, recusados }
}
