import { SERVICOS_ROUTES } from './servicos.routes.js'
import { normalizeServico } from './servicos.model.js'
import { DEV_API_BASE_URL } from '../../../config/api.js'
import { createHttpClient } from '../../../services/httpClient.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEV_API_BASE_URL
const { request } = createHttpClient(BASE_URL)

/**
 * @returns {Promise<import('./servicos.model.js').Servico[]>}
 */
export async function getServicos() {
  return (await request(SERVICOS_ROUTES.list)).map(normalizeServico)
}

/**
 * @param {string} id
 * @param {boolean} ativo
 * @returns {Promise<import('./servicos.model.js').Servico>}
 */
export async function updateServicoAtivo(id, ativo) {
  const data = await request(SERVICOS_ROUTES.detail(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ativo }),
  })
  return normalizeServico(data)
}
