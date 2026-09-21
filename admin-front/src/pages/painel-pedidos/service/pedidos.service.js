import { PEDIDOS_ROUTES } from './pedidos.routes.js'
import { normalizePedido } from './pedidos.model.js'
import { DEV_API_BASE_URL } from '../../../config/api.js'
import { createHttpClient } from '../../../services/httpClient.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEV_API_BASE_URL
const { request } = createHttpClient(BASE_URL)

/**
 * @returns {Promise<import('./pedidos.model.js').Pedido[]>}
 */
export async function getPedidos() {
  return (await request(PEDIDOS_ROUTES.list)).map(normalizePedido)
}

/**
 * @param {string} id
 * @param {import('./pedidos.model.js').Pedido['status']} status
 * @returns {Promise<import('./pedidos.model.js').Pedido>}
 */
export async function updatePedidoStatus(id, status) {
  const data = await request(PEDIDOS_ROUTES.detail(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return normalizePedido(data)
}
