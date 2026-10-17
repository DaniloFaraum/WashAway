import { PEDIDOS_ROUTES } from './pedidos.routes.js'
import { normalizePedido } from './pedidos.model.js'
import { BACKEND_API_BASE_URL } from '../../../config/api.js'
import { createHttpClient } from '../../../services/httpClient.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? BACKEND_API_BASE_URL
const { request } = createHttpClient(BASE_URL)

/**
 * @returns {Promise<import('./pedidos.model.js').Pedido[]>}
 */
export async function getPedidos() {
  return (await request(PEDIDOS_ROUTES.list)).map(normalizePedido)
}

/**
 * Muda o status (I15). `motivo` só vai no body ao recusar e quando preenchido.
 * Transição não permitida: o backend responde 409 e o erro lançado traz a
 * mensagem dele em `mensagemBackend`.
 * @param {string} id
 * @param {import('./pedidos.model.js').Pedido['status']} status
 * @param {string} [motivo]
 * @returns {Promise<import('./pedidos.model.js').Pedido>}
 */
export async function updatePedidoStatus(id, status, motivo) {
  const texto = motivo?.trim()
  const body = status === 'recusado' && texto ? { status, motivo: texto } : { status }
  const data = await request(PEDIDOS_ROUTES.detail(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizePedido(data)
}
