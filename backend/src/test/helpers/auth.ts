import type { Test } from 'supertest'
import { assinarToken } from '../../auth/token.js'

// Helpers de autenticação pros testes de rota protegida. Os tokens são gerados
// direto com `assinarToken` (mesmo segredo da aplicação — JWT_SECRET de teste
// no vitest.config.ts), sem passar pela rota de login.
//
// `tokenDeLavaRapido` é definido pelo I17 (sessão do lava-rápido): quem
// implementar troca o stub abaixo por `assinarToken({ id, tipo: 'lavaRapido' })`,
// mantendo a assinatura.

export function tokenDeCliente(cliente: { id: string }): string {
  return assinarToken({ id: cliente.id, tipo: 'cliente' })
}

export function tokenDeLavaRapido(lavaRapido: { id: string }): string {
  throw new Error(`tokenDeLavaRapido(${lavaRapido.id}): definir junto com o I17 (token de lava-rápido)`)
}

/** Anexa o token no header Authorization (Bearer) de uma requisição supertest. */
export function comToken(req: Test, token: string): Test {
  return req.set('Authorization', `Bearer ${token}`)
}
