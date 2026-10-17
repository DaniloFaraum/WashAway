import { getToken } from '../login/sessao.storage.js'

// Cliente HTTP das páginas do painel (I17): anexa `Authorization: Bearer <token>`
// quando há sessão e avisa a sessão quando o backend responde 401 (token
// ausente, inválido ou expirado) — `useSessaoEmpresa` volta para o Login.

/** @type {(() => void) | null} */
let aoExpirarSessao = null

/**
 * Registra quem trata a sessão expirada (401). `null` remove.
 * @param {(() => void) | null} callback
 */
export function definirAoExpirarSessao(callback) {
  aoExpirarSessao = callback
}

/**
 * @param {RequestInit['headers']} headers
 * @returns {Headers}
 */
function comToken(headers) {
  const resultado = new Headers(headers)
  const token = getToken()
  if (token && !resultado.has('Authorization')) {
    resultado.set('Authorization', `Bearer ${token}`)
  }
  return resultado
}

/**
 * `fetch` com o token da sessão; em 401 avisa a sessão (e devolve a resposta).
 * Para quem precisa tratar o status (ex.: reabrir intercorrência).
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function fetchComToken(url, options = {}) {
  const response = await fetch(url, { ...options, headers: comToken(options.headers) })
  if (response.status === 401) aoExpirarSessao?.()
  return response
}

/**
 * @param {Response} response
 * @returns {Promise<string | null>}
 */
async function lerMensagemDeErro(response) {
  try {
    const corpo = await response.json()
    return typeof corpo?.error === 'string' ? corpo.error : null
  } catch {
    return null
  }
}

/**
 * @param {string} baseUrl
 * @returns {{ request: (path: string, options?: RequestInit) => Promise<any> }}
 */
export function createHttpClient(baseUrl) {
  async function request(path, options) {
    const response = await fetchComToken(`${baseUrl}${path}`, options)
    if (!response.ok) {
      // A mensagem continua a mesma; `status` e `mensagemBackend` (o `error` do
      // corpo JSON, quando houver) vão junto para quem quiser mostrar ao usuário (I15).
      const erro = new Error(`Falha na requisição ${path}: ${response.status}`)
      erro.status = response.status
      erro.mensagemBackend = await lerMensagemDeErro(response)
      throw erro
    }
    return response.json()
  }

  return { request }
}
