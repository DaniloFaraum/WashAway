import { BACKEND_API_BASE_URL } from '@/config/api'

// Cliente HTTP compartilhado das rotas do back-end (I2). Rotas autenticadas do
// cliente (I3, I13, I18…) usam `apiFetch`:
// - injeta `Authorization: Bearer <token>` quando há sessão;
// - em 401 de uma requisição que levou token, chama o handler registrado pela
//   sessão (`SessaoClienteProvider`), que encerra a sessão e leva ao login com
//   "Sua sessão expirou";
// - falha de rede vira `ErroRede` (mensagem pronta pra tela).
// Devolve o `Response` cru: cada service decide o que fazer com cada status.

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? BACKEND_API_BASE_URL

export class ErroRede extends Error {
  constructor() {
    super('Não foi possível conectar. Verifique sua internet e tente de novo.')
    this.name = 'ErroRede'
  }
}

let tokenDaSessao: string | null = null
let aoExpirarSessao: (() => void) | null = null

/** Token enviado nas próximas requisições (`null` = sem sessão). Chamado pela sessão. */
export function definirTokenDaSessao(token: string | null): void {
  tokenDaSessao = token
}

/** Registra quem trata um 401 com token. Devolve a função que desfaz o registro. */
export function registrarAoExpirarSessao(handler: () => void): () => void {
  aoExpirarSessao = handler
  return () => {
    if (aoExpirarSessao === handler) aoExpirarSessao = null
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) }
  if (typeof init.body === 'string' && !Object.keys(headers).some((nome) => nome.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json'
  }
  const token = tokenDaSessao
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new ErroRede()
  }

  // Só conta como sessão expirada se a requisição levou token: o 401 do login
  // (credenciais erradas, sem sessão) é tratado pela própria tela. E só se a
  // sessão ainda for a mesma (uma resposta atrasada não derruba um login novo).
  if (response.status === 401 && token && token === tokenDaSessao) aoExpirarSessao?.()

  return response
}
