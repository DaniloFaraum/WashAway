import { apiFetch } from '@/services/httpClient'
import { normalizeCliente, type Cliente } from '@/features/clientes/service/clientes.model'
import { AUTH_ROUTES } from './auth.routes'

// Login e "meus dados" do cliente (I2). Falha de rede chega como `ErroRede`
// (de `@/services/httpClient`).

export const MENSAGEM_CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos'

export class CredenciaisInvalidasError extends Error {
  constructor() {
    super(MENSAGEM_CREDENCIAIS_INVALIDAS)
    this.name = 'CredenciaisInvalidasError'
  }
}

export const MENSAGEM_MUITAS_TENTATIVAS = 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'

/** 429: limite de tentativas do backend (I17). A mensagem vem do back-end quando houver. */
export class MuitasTentativasError extends Error {
  constructor(mensagem?: string) {
    super(mensagem || MENSAGEM_MUITAS_TENTATIVAS)
    this.name = 'MuitasTentativasError'
  }
}

/** Monta o `MuitasTentativasError` com a mensagem `{ error }` do corpo do 429. */
export async function erroDeMuitasTentativas(response: Response): Promise<MuitasTentativasError> {
  const corpo = await response.json().catch(() => null)
  return new MuitasTentativasError(typeof corpo?.error === 'string' ? corpo.error : undefined)
}

/** 401 em rota autenticada: sessão inválida/expirada (o httpClient já avisou a sessão). */
export class NaoAutenticadoError extends Error {
  constructor() {
    super('Sua sessão expirou')
    this.name = 'NaoAutenticadoError'
  }
}

export interface Login {
  token: string
  expiraEm: string
  cliente: Cliente
}

export async function entrar(email: string, senha: string): Promise<Login> {
  const response = await apiFetch(AUTH_ROUTES.login, { method: 'POST', body: JSON.stringify({ email, senha }) })

  if (response.status === 401) throw new CredenciaisInvalidasError()
  if (response.status === 429) throw await erroDeMuitasTentativas(response)
  if (!response.ok) throw new Error('Não foi possível entrar agora. Tente de novo.')

  const data = await response.json()
  return { token: String(data.token), expiraEm: String(data.expiraEm), cliente: normalizeCliente(data.cliente) }
}

export async function me(): Promise<Cliente> {
  const response = await apiFetch(AUTH_ROUTES.me)

  if (response.status === 401) throw new NaoAutenticadoError()
  if (!response.ok) throw new Error('Não foi possível carregar seus dados. Tente de novo.')

  return normalizeCliente(await response.json())
}
