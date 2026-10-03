import { VEICULOS_ROUTES } from './veiculos.routes.js'
import { normalizeVeiculo } from './veiculos.model.js'
import { BACKEND_API_BASE_URL } from '../../../config/api.js'
import { createHttpClient } from '../../../services/httpClient.js'
import { getEmpresaLogadaId } from '../../../login/sessao.storage.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? BACKEND_API_BASE_URL
const { request } = createHttpClient(BASE_URL)

/**
 * @returns {Promise<import('./veiculos.model.js').Veiculo[]>}
 */
export async function getVeiculos() {
  return (await request(VEICULOS_ROUTES.list(getEmpresaLogadaId()))).map(normalizeVeiculo)
}
