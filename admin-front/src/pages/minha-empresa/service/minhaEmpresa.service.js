import { MINHA_EMPRESA_ROUTES } from './minhaEmpresa.routes.js'
import { normalizeSolicitacaoExclusao } from './minhaEmpresa.model.js'
import { BACKEND_API_BASE_URL } from '../../../config/api.js'
import { fetchComToken } from '../../../services/httpClient.js'

// Exclusão da empresa por solicitação (i17-interno-exclusao): a empresa só
// solicita, vê e cancela; quem exclui é a equipe WashAway, ao aprovar.
// Usa `fetchComToken` (e não `createHttpClient`) porque o 404 do GET quer dizer
// "nunca solicitou", não erro.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? BACKEND_API_BASE_URL

async function chamar(metodo, baseUrl, body) {
  const response = await fetchComToken(`${baseUrl}${MINHA_EMPRESA_ROUTES.solicitacaoExclusao}`, {
    method: metodo,
    ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => null)
  return { response, data }
}

/**
 * Solicitação mais recente da empresa logada (qualquer status), ou `null` se nunca houve.
 * @param {string} [baseUrl] usado nos testes para apontar a um backend de teste isolado
 * @returns {Promise<import('./minhaEmpresa.model.js').SolicitacaoExclusao | null>}
 */
export async function getSolicitacaoExclusao(baseUrl = BASE_URL) {
  const { response, data } = await chamar('GET', baseUrl)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(data?.error ?? 'Não foi possível carregar a solicitação de exclusão.')
  return normalizeSolicitacaoExclusao(data)
}

/**
 * Solicita a exclusão (se já houver uma pendente, o backend devolve a mesma).
 * @param {string} [motivo]
 * @param {string} [baseUrl]
 * @returns {Promise<import('./minhaEmpresa.model.js').SolicitacaoExclusao>}
 */
export async function solicitarExclusao(motivo, baseUrl = BASE_URL) {
  const texto = motivo?.trim()
  const { response, data } = await chamar('POST', baseUrl, texto ? { motivo: texto } : {})
  if (!response.ok) throw new Error(data?.error ?? 'Não foi possível solicitar a exclusão.')
  return normalizeSolicitacaoExclusao(data)
}

/**
 * Cancela a solicitação pendente.
 * @param {string} [baseUrl]
 * @returns {Promise<import('./minhaEmpresa.model.js').SolicitacaoExclusao>}
 */
export async function cancelarSolicitacaoExclusao(baseUrl = BASE_URL) {
  const { response, data } = await chamar('DELETE', baseUrl)
  if (response.status === 404) throw new Error('Não há solicitação de exclusão pendente.')
  if (!response.ok) throw new Error(data?.error ?? 'Não foi possível cancelar a solicitação.')
  return normalizeSolicitacaoExclusao(data)
}
