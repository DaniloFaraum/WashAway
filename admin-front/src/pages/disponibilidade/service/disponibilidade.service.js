import { INTERCORRENCIAS_ROUTES } from './disponibilidade.routes.js'
import { normalizeIntercorrencia } from './disponibilidade.model.js'
import { DEV_API_BASE_URL } from '../../../config/api.js'
import { createHttpClient } from '../../../services/httpClient.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEV_API_BASE_URL
const { request } = createHttpClient(BASE_URL)

/**
 * @returns {Promise<import('./disponibilidade.model.js').Intercorrencia[]>}
 */
export async function getIntercorrencias() {
  return (await request(INTERCORRENCIAS_ROUTES.list)).map(normalizeIntercorrencia)
}

/**
 * @param {{ data: string, motivo: string, diaInteiro: boolean, horaInicio?: string, horaFim?: string }} novaIntercorrencia
 * @returns {Promise<import('./disponibilidade.model.js').Intercorrencia>}
 */
export async function createIntercorrencia(novaIntercorrencia) {
  const data = await request(INTERCORRENCIAS_ROUTES.list, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novaIntercorrencia),
  })
  return normalizeIntercorrencia(data)
}
