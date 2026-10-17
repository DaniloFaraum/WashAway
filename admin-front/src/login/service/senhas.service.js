import { SENHAS_ROUTES } from './senhas.routes.js'
import { normalizeSessao } from './lavaRapidos.model.js'
import { BACKEND_API_BASE_URL } from '../../config/api.js'

// Senha do painel (i17-senha-gerada): "esqueci minha senha" (público) e troca
// obrigatória. A troca usa o token de escopo `trocar-senha` do login com a
// senha temporária — passado explicitamente (ele não fica no localStorage) e
// sem o httpClient, para um 401 aqui não derrubar uma sessão que nem existe.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? BACKEND_API_BASE_URL

export const MENSAGEM_ESQUECI_SENHA_PADRAO = 'Se o e-mail estiver cadastrado, enviaremos uma senha temporária.'
export const MENSAGEM_TROCA_EXPIRADA = 'O tempo para definir a nova senha acabou. Entre de novo com a senha temporária.'

/** Token de troca expirado ou já usado: o painel volta ao Login. */
export class TrocaDeSenhaExpiradaError extends Error {
  constructor() {
    super(MENSAGEM_TROCA_EXPIRADA)
    this.name = 'TrocaDeSenhaExpiradaError'
  }
}

/**
 * @param {string} email
 * @param {string} [baseUrl] usado nos testes para apontar a um backend de teste isolado
 * @returns {Promise<string>} mensagem genérica de confirmação (não revela se o e-mail existe)
 */
export async function esqueciSenha(email, baseUrl = BASE_URL) {
  const response = await fetch(`${baseUrl}${SENHAS_ROUTES.esqueciSenha}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    // 400 (e-mail inválido) e 429 (limite) já vêm com a mensagem do backend.
    throw new Error(data?.error ?? 'Não foi possível enviar o pedido agora.')
  }
  return data?.mensagem ?? MENSAGEM_ESQUECI_SENHA_PADRAO
}

/**
 * Define a senha nova com o token de troca; devolve a sessão normal do painel.
 * @param {{ novaSenha: string, token: string }} dados
 * @param {string} [baseUrl]
 * @returns {Promise<import('./lavaRapidos.model.js').SessaoEmpresa>}
 */
export async function trocarSenha({ novaSenha, token }, baseUrl = BASE_URL) {
  const response = await fetch(`${baseUrl}${SENHAS_ROUTES.trocarSenha}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ novaSenha }),
  })
  const data = await response.json().catch(() => null)

  if (response.status === 401) throw new TrocaDeSenhaExpiradaError()
  if (!response.ok) {
    throw new Error(data?.error ?? 'Não foi possível definir a nova senha.')
  }
  return normalizeSessao(data)
}
