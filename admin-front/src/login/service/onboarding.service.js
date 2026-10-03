import { ONBOARDING_ROUTES } from './onboarding.routes.js'
import { normalizeSolicitacao, TEXTO_ACEITE } from './onboarding.model.js'
import { normalizeLavaRapido } from './lavaRapidos.model.js'
import { BACKEND_API_BASE_URL } from '../../config/api.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? BACKEND_API_BASE_URL

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  return { response, data }
}

/**
 * @param {{ name: string, address?: string, cnpj: string }} dados
 * @param {string} [baseUrl] usado nos testes para apontar a um backend de teste isolado
 * @returns {Promise<import('./onboarding.model.js').SolicitacaoOnboarding>}
 */
export async function solicitar(dados, baseUrl = BASE_URL) {
  const { response, data } = await postJson(`${baseUrl}${ONBOARDING_ROUTES.solicitacoes}`, dados)

  if (response.status === 409) {
    throw new Error('Já existe uma empresa cadastrada com esse CNPJ.')
  }
  if (!response.ok) {
    throw new Error(data?.error ?? 'Não foi possível enviar a solicitação de cadastro.')
  }

  return normalizeSolicitacao(data)
}

/**
 * @param {string} id
 * @param {string} [baseUrl]
 * @returns {Promise<import('./onboarding.model.js').SolicitacaoOnboarding>}
 */
export async function getSolicitacao(id, baseUrl = BASE_URL) {
  const response = await fetch(`${baseUrl}${ONBOARDING_ROUTES.solicitacao(id)}`)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error ?? 'Não foi possível carregar a solicitação de cadastro.')
  }

  return normalizeSolicitacao(data)
}

/**
 * Assina o contrato (aceite mock "eu aceito") — o backend cria a empresa e a devolve.
 * @param {string} id
 * @param {string} [baseUrl]
 * @returns {Promise<import('./lavaRapidos.model.js').LavaRapido>}
 */
export async function aceitarContrato(id, baseUrl = BASE_URL) {
  const { response, data } = await postJson(`${baseUrl}${ONBOARDING_ROUTES.aceite(id)}`, {
    aceite: TEXTO_ACEITE,
  })

  if (response.status === 409) {
    throw new Error(data?.error ?? 'Este contrato já foi assinado.')
  }
  if (!response.ok) {
    throw new Error(data?.error ?? 'Não foi possível assinar o contrato.')
  }

  return normalizeLavaRapido(data)
}
