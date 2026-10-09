import { apiFetch } from '@/services/httpClient'
import { CLIENTES_ROUTES } from './clientes.routes'
import { normalizeCliente, type Cliente } from './clientes.model'

// Cadastro de cliente (I1). Usa o `apiFetch` (que devolve o Response cru) pra
// distinguir 409 e 400; falha de rede já chega como `ErroRede`.

export { ErroRede } from '@/services/httpClient'

export class EmailJaCadastradoError extends Error {
  constructor() {
    super('Este e-mail já está cadastrado')
    this.name = 'EmailJaCadastradoError'
  }
}

export type CamposCadastro = Partial<Record<'nome' | 'email' | 'senha', string>>

export class ErroValidacao extends Error {
  constructor(readonly campos: CamposCadastro) {
    super('Confira os campos destacados')
    this.name = 'ErroValidacao'
  }
}

export interface DadosCadastro {
  nome: string
  email: string
  senha: string
}

export async function cadastrarCliente(dados: DadosCadastro): Promise<Cliente> {
  const response = await apiFetch(CLIENTES_ROUTES.cadastro, { method: 'POST', body: JSON.stringify(dados) })

  if (response.status === 201) return normalizeCliente(await response.json())
  if (response.status === 409) throw new EmailJaCadastradoError()
  if (response.status === 400) {
    const corpo = await response.json().catch(() => ({}))
    throw new ErroValidacao(corpo?.campos ?? {})
  }
  throw new Error('Não foi possível criar a conta agora. Tente de novo.')
}
