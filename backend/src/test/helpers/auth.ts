import type { Test } from 'supertest'
import { assinarToken } from '../../auth/token.js'

// Helpers de autenticação pros testes de rota protegida. Os tokens são gerados
// direto com `assinarToken` (mesmo segredo da aplicação — JWT_SECRET de teste
// no vitest.config.ts), sem passar pela rota de login.

export function tokenDeCliente(cliente: { id: string }): string {
  return assinarToken({ id: cliente.id, tipo: 'cliente' })
}

/** Token de lava-rápido (painel, I17) — mesmo formato do `POST /lavaRapidos/login`. */
export function tokenDeLavaRapido(lavaRapido: { id: string }): string {
  return assinarToken({ id: lavaRapido.id, tipo: 'lavaRapido' })
}

/** Token de usuário interno (i17-interno-exclusao) com as permissões dadas — mesmo formato do `POST /auth/interno/login`. */
export function tokenDeInterno(permissoes: string[], interno: { id: string } = { id: 'interno-de-teste' }): string {
  return assinarToken({ id: interno.id, tipo: 'interno', permissoes })
}

/** Anexa o token no header Authorization (Bearer) de uma requisição supertest. */
export function comToken(req: Test, token: string): Test {
  return req.set('Authorization', `Bearer ${token}`)
}
