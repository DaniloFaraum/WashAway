import { PEDIDOS_ROUTES } from './pedidos.routes.js'
import { normalizePedido } from './pedidos.model.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

/**
 * @returns {Promise<import('./pedidos.model.js').Pedido[]>}
 */
export async function getPedidos() {
  const response = await fetch(`${BASE_URL}${PEDIDOS_ROUTES.list}`)
  if (!response.ok) {
    throw new Error(`Falha ao buscar pedidos: ${response.status}`)
  }
  const data = await response.json()
  return data.map(normalizePedido)
}

/**
 * @param {string} id
 * @param {import('./pedidos.model.js').Pedido['status']} status
 * @returns {Promise<import('./pedidos.model.js').Pedido>}
 */
export async function updatePedidoStatus(id, status) {
  const response = await fetch(`${BASE_URL}${PEDIDOS_ROUTES.detail(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) {
    throw new Error(`Falha ao atualizar pedido ${id}: ${response.status}`)
  }
  const data = await response.json()
  return normalizePedido(data)
}
