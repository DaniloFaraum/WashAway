import { afterEach, describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { assinarToken, expiracaoDoToken, garantirConfiguracaoDoToken, verificarToken } from './token.js'

const segredoOriginal = process.env.JWT_SECRET
const validadeOriginal = process.env.JWT_EXPIRES_IN

// `process.env.X = undefined` gravaria o texto "undefined": restaura apagando.
function restaurar(nome: string, valor: string | undefined) {
  if (valor === undefined) delete process.env[nome]
  else process.env[nome] = valor
}

afterEach(() => {
  restaurar('JWT_SECRET', segredoOriginal)
  restaurar('JWT_EXPIRES_IN', validadeOriginal)
})

describe('assinarToken / verificarToken', () => {
  it('ida e volta: devolve { id, tipo, permissoes } do token', () => {
    const token = assinarToken({ id: 'c1', tipo: 'cliente' })

    expect(verificarToken(token)).toEqual({ id: 'c1', tipo: 'cliente', permissoes: [] })
  })

  it('payload segue o contrato { sub, tipo, permissoes?, escopo? } em HS256', () => {
    const token = assinarToken({ id: 'i1', tipo: 'interno', permissoes: ['admin'], escopo: 'trocar-senha' })

    const decodificado = jwt.decode(token, { complete: true })!
    expect(decodificado.header.alg).toBe('HS256')
    expect(decodificado.payload).toMatchObject({ sub: 'i1', tipo: 'interno', permissoes: ['admin'], escopo: 'trocar-senha' })
    expect(verificarToken(token)).toEqual({ id: 'i1', tipo: 'interno', permissoes: ['admin'], escopo: 'trocar-senha' })
  })

  it('validade padrão de 7 dias (JWT_EXPIRES_IN)', () => {
    const token = assinarToken({ id: 'c1', tipo: 'cliente' })

    const seteDias = 7 * 24 * 60 * 60 * 1000
    expect(Math.abs(new Date(expiracaoDoToken(token)).getTime() - (Date.now() + seteDias))).toBeLessThan(5_000)
  })

  it('token expirado lança erro', () => {
    const expirado = jwt.sign({ tipo: 'cliente' }, process.env.JWT_SECRET!, { subject: 'c1', expiresIn: -10 })

    expect(() => verificarToken(expirado)).toThrow()
  })

  it('token assinado com outro segredo lança erro', () => {
    const forjado = jwt.sign({ tipo: 'cliente' }, 'outro-segredo', { subject: 'c1' })

    expect(() => verificarToken(forjado)).toThrow()
  })

  it('token sem assinatura (alg none) lança erro', () => {
    const semAssinatura = jwt.sign({ tipo: 'cliente', sub: 'c1' }, '', { algorithm: 'none' })

    expect(() => verificarToken(semAssinatura)).toThrow()
  })

  it('payload sem sub ou com tipo desconhecido lança erro', () => {
    const semSub = jwt.sign({ tipo: 'cliente' }, process.env.JWT_SECRET!)
    const tipoDesconhecido = jwt.sign({ tipo: 'admin' }, process.env.JWT_SECRET!, { subject: 'c1' })

    expect(() => verificarToken(semSub)).toThrow()
    expect(() => verificarToken(tipoDesconhecido)).toThrow()
  })

  it('token sem exp (seria eterno) lança erro', () => {
    const semExp = jwt.sign({ tipo: 'cliente' }, process.env.JWT_SECRET!, { subject: 'c1' })

    expect(() => verificarToken(semExp)).toThrow()
  })

  it('permissoes que não é lista de textos ou escopo que não é texto lançam erro', () => {
    const assinar = (extra: Record<string, unknown>) =>
      jwt.sign({ tipo: 'interno', ...extra }, process.env.JWT_SECRET!, { subject: 'i1', expiresIn: '1h' })

    expect(() => verificarToken(assinar({ permissoes: 'admin' }))).toThrow()
    expect(() => verificarToken(assinar({ permissoes: [1] }))).toThrow()
    expect(() => verificarToken(assinar({ escopo: 123 }))).toThrow()
  })
})

describe('JWT_SECRET obrigatório', () => {
  it('sem JWT_SECRET, garantirConfiguracaoDoToken e assinarToken lançam erro', () => {
    delete process.env.JWT_SECRET

    expect(() => garantirConfiguracaoDoToken()).toThrow(/JWT_SECRET/)
    expect(() => assinarToken({ id: 'c1', tipo: 'cliente' })).toThrow(/JWT_SECRET/)
  })

  it('JWT_SECRET curto: garantirConfiguracaoDoToken recusa na subida', () => {
    process.env.JWT_SECRET = 'curto'

    expect(() => garantirConfiguracaoDoToken()).toThrow(/JWT_SECRET curto/)
  })

  it('JWT_EXPIRES_IN inválido: garantirConfiguracaoDoToken recusa na subida', () => {
    process.env.JWT_EXPIRES_IN = '7 dias'

    expect(() => garantirConfiguracaoDoToken()).toThrow(/JWT_EXPIRES_IN/)
  })

  it('configuração válida: garantirConfiguracaoDoToken não lança', () => {
    expect(() => garantirConfiguracaoDoToken()).not.toThrow()
  })
})
