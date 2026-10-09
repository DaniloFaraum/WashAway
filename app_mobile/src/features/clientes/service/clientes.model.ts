// Cliente do app como a API devolve (sem senha). Ver backend: POST /auth/cliente/cadastro, GET /clientes/me.
export interface Cliente {
  id: string
  nome: string
  email: string
}

export function normalizeCliente(data: any): Cliente {
  return {
    id: String(data.id),
    nome: String(data.nome ?? ''),
    email: String(data.email ?? ''),
  }
}
