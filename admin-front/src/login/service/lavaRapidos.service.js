import { LAVA_RAPIDOS_ROUTES } from './lavaRapidos.routes.js'
import { normalizeLavaRapido } from './lavaRapidos.model.js'
import { BACKEND_API_BASE_URL } from '../../config/api.js'
import { createHttpClient } from '../../services/httpClient.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? BACKEND_API_BASE_URL
const { request } = createHttpClient(BASE_URL)

/**
 * @param {string} id
 * @returns {Promise<import('./lavaRapidos.model.js').LavaRapido>}
 */
export async function getLavaRapido(id) {
  return normalizeLavaRapido(await request(LAVA_RAPIDOS_ROUTES.detail(id)))
}

/**
 * @param {{ name: string, address?: string, cnpj: string }} dados
 * @param {string} [baseUrl] usado nos testes para apontar a um backend de teste isolado
 * @returns {Promise<import('./lavaRapidos.model.js').LavaRapido>}
 */
export async function cadastrar(dados, baseUrl = BASE_URL) {
  const response = await fetch(`${baseUrl}${LAVA_RAPIDOS_ROUTES.cadastro}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
  const data = await response.json().catch(() => null)

  if (response.status === 409) {
    throw new Error('Já existe uma empresa cadastrada com esse CNPJ.')
  }
  if (!response.ok) {
    throw new Error(data?.error ?? 'Não foi possível cadastrar a empresa.')
  }

  return normalizeLavaRapido(data)
}

/**
 * @param {{ cnpj: string, senha: string }} credenciais
 * @param {string} [baseUrl] usado nos testes para apontar a um backend de teste isolado
 * @returns {Promise<import('./lavaRapidos.model.js').LavaRapido>}
 */
export async function entrar(credenciais, baseUrl = BASE_URL) {
  const response = await fetch(`${baseUrl}${LAVA_RAPIDOS_ROUTES.login}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credenciais),
  })

  if (response.status === 401) {
    throw new Error('CNPJ ou senha inválidos.')
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error ?? 'Não foi possível entrar.')
  }

  return normalizeLavaRapido(await response.json())
}
