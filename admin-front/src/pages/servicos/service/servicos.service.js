import { SERVICOS_ROUTES } from './servicos.routes.js'
import { normalizeItemServico, normalizeServico } from './servicos.model.js'
import { BACKEND_API_BASE_URL } from '../../../config/api.js'
import { createHttpClient } from '../../../services/httpClient.js'
import { getEmpresaLogadaId } from '../../../login/sessao.storage.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? BACKEND_API_BASE_URL
const { request } = createHttpClient(BASE_URL)

const JSON_HEADERS = { 'Content-Type': 'application/json' }

/**
 * @returns {Promise<import('./servicos.model.js').Servico[]>}
 */
export async function getServicos() {
  return (await request(SERVICOS_ROUTES.list(getEmpresaLogadaId()))).map(normalizeServico)
}

/**
 * @returns {Promise<import('./servicos.model.js').ItemServico[]>}
 */
export async function getItensCatalogo() {
  return (await request(SERVICOS_ROUTES.itens)).map(normalizeItemServico)
}

/**
 * @param {{ nome: string, preco: number, itemIds: string[] }} dados
 * @returns {Promise<import('./servicos.model.js').Servico>}
 */
export async function criarServico(dados) {
  const data = await request(SERVICOS_ROUTES.create, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ lavaRapidoId: getEmpresaLogadaId(), ...dados }),
  })
  return normalizeServico(data)
}

/**
 * @param {string} id
 * @param {{ nome: string, preco: number, itemIds: string[] }} dados
 * @returns {Promise<import('./servicos.model.js').Servico>}
 */
export async function atualizarServico(id, dados) {
  const data = await request(SERVICOS_ROUTES.detail(id), {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(dados),
  })
  return normalizeServico(data)
}

/**
 * @param {string} id
 * @param {boolean} ativo
 * @returns {Promise<import('./servicos.model.js').Servico>}
 */
export async function updateServicoAtivo(id, ativo) {
  const data = await request(SERVICOS_ROUTES.detail(id), {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ ativo }),
  })
  return normalizeServico(data)
}
