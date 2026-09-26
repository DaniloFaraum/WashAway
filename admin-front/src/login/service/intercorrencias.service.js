import { INTERCORRENCIAS_ROUTES } from './intercorrencias.routes.js'
import { BACKEND_API_BASE_URL } from '../../config/api.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? BACKEND_API_BASE_URL

/**
 * @param {string} id
 * @param {string} [baseUrl] usado nos testes para apontar a um backend de teste isolado
 * @returns {Promise<void>}
 */
export async function reabrirIntercorrencia(id, baseUrl = BASE_URL) {
  const response = await fetch(`${baseUrl}${INTERCORRENCIAS_ROUTES.detail(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reaberta: true }),
  })

  if (!response.ok) {
    throw new Error('Não foi possível reabrir.')
  }
}
