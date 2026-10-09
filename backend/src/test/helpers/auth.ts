import type { Test } from 'supertest'

// Helpers de autenticação pros testes de rota protegida.
//
// O formato do token ainda não existe: `tokenDeCliente` é definido pelo I2
// (login de cliente) e `tokenDeLavaRapido` pelo I17 (sessão do lava-rápido).
// Quem implementar essas histórias troca os stubs abaixo pela geração real
// (assinando com o mesmo segredo/serviço da aplicação, sem passar pela rota de
// login), mantendo as assinaturas.

export function tokenDeCliente(cliente: { id: string }): string {
  throw new Error(`tokenDeCliente(${cliente.id}): definir junto com o I2 (token de cliente)`)
}

export function tokenDeLavaRapido(lavaRapido: { id: string }): string {
  throw new Error(`tokenDeLavaRapido(${lavaRapido.id}): definir junto com o I17 (token de lava-rápido)`)
}

/** Anexa o token no header Authorization (Bearer) de uma requisição supertest. */
export function comToken(req: Test, token: string): Test {
  return req.set('Authorization', `Bearer ${token}`)
}
