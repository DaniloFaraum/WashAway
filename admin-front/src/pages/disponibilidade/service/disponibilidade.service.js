import { HORARIOS_ROUTES, INTERCORRENCIAS_ROUTES } from './disponibilidade.routes.js'
import { normalizeIntercorrencia } from './disponibilidade.model.js'
import { BACKEND_API_BASE_URL } from '../../../config/api.js'
import { createHttpClient, fetchComToken } from '../../../services/httpClient.js'
import { normalizeHorarioDia } from '../../../login/service/lavaRapidos.model.js'
import { getEmpresaLogadaId } from '../../../login/sessao.storage.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? BACKEND_API_BASE_URL
const { request } = createHttpClient(BASE_URL)

/**
 * @returns {Promise<import('./disponibilidade.model.js').Intercorrencia[]>}
 */
export async function getIntercorrencias() {
  return (await request(INTERCORRENCIAS_ROUTES.list(getEmpresaLogadaId()))).map(normalizeIntercorrencia)
}

/**
 * @param {{ data: string, motivo: string, diaInteiro: boolean, horaInicio?: string, horaFim?: string }} novaIntercorrencia
 * @returns {Promise<import('./disponibilidade.model.js').Intercorrencia>}
 */
export async function createIntercorrencia(novaIntercorrencia) {
  const data = await request(INTERCORRENCIAS_ROUTES.create, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novaIntercorrencia),
  })
  return normalizeIntercorrencia(data)
}

/**
 * Edita um fechamento da empresa (`PATCH /intercorrencias/:id` com os mesmos campos do cadastro).
 * Em erro, a mensagem do backend vem no `Error` (ex.: 409 "Intercorrência já reaberta — cadastre um novo fechamento").
 * @param {string} id
 * @param {{ data: string, motivo: string, diaInteiro: boolean, horaInicio?: string, horaFim?: string }} dados
 * @param {string} [baseUrl] usado nos testes para apontar a um backend de teste isolado
 * @returns {Promise<import('./disponibilidade.model.js').Intercorrencia>}
 */
export async function editarIntercorrencia(id, dados, baseUrl = BASE_URL) {
  const response = await fetchComToken(`${baseUrl}${INTERCORRENCIAS_ROUTES.detail(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error ?? `Não foi possível editar o fechamento (${response.status}).`)
  }
  return normalizeIntercorrencia(await response.json())
}

/**
 * Substitui o horário semanal da empresa logada (`PUT /lavaRapidos/:id/horarios`, com token).
 * Em erro, a mensagem do backend (ex.: "Abertura de segunda deve ser antes do fechamento")
 * vem no `Error`.
 * @param {{ diaSemana: number, fechado: boolean, abertura?: string, fechamento?: string }[]} dias - os 7 dias
 * @param {string} [baseUrl] usado nos testes para apontar a um backend de teste isolado
 * @returns {Promise<import('../../../login/service/lavaRapidos.model.js').HorarioDia[]>}
 */
export async function salvarHorarios(dias, baseUrl = BASE_URL) {
  const response = await fetchComToken(`${baseUrl}${HORARIOS_ROUTES.update(getEmpresaLogadaId())}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dias }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error ?? `Não foi possível salvar o horário (${response.status}).`)
  }
  return (await response.json()).map(normalizeHorarioDia)
}
