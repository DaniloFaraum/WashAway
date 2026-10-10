import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CredenciaisInvalidasError,
  entrar,
  me,
  MuitasTentativasError,
  NaoAutenticadoError,
} from '../features/auth/service/auth.service'
import { definirTokenDaSessao } from '../services/httpClient'

function resposta(status: number, corpo: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as Response
}

describe('auth.service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    definirTokenDaSessao(null)
  })

  it('entrar ok: faz POST /auth/cliente/login e devolve token, validade e cliente', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      resposta(200, {
        token: 'tok',
        expiraEm: '2026-10-16T00:00:00.000Z',
        cliente: { id: 'c1', nome: 'Ana', email: 'ana@exemplo.com' },
      }),
    )

    const login = await entrar('ana@exemplo.com', '123456')

    expect(login).toEqual({
      token: 'tok',
      expiraEm: '2026-10-16T00:00:00.000Z',
      cliente: { id: 'c1', nome: 'Ana', email: 'ana@exemplo.com' },
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toEqual(expect.stringContaining('/auth/cliente/login'))
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ email: 'ana@exemplo.com', senha: '123456' }) })
  })

  it('entrar com 401 vira "E-mail ou senha incorretos"', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(401, { error: 'E-mail ou senha incorretos' }))

    const erro = await entrar('ana@exemplo.com', 'errada').catch((e) => e)

    expect(erro).toBeInstanceOf(CredenciaisInvalidasError)
    expect(erro.message).toBe('E-mail ou senha incorretos')
  })

  it('entrar com 429 vira MuitasTentativasError com a mensagem do back-end (I17)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(429, { error: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' }))

    const erro = await entrar('ana@exemplo.com', 'errada').catch((e) => e)

    expect(erro).toBeInstanceOf(MuitasTentativasError)
    expect(erro.message).toBe('Muitas tentativas. Aguarde 15 minutos e tente de novo.')
  })

  it('me com token devolve o cliente', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(200, { id: 'c1', nome: 'Ana', email: 'ana@exemplo.com' }))
    definirTokenDaSessao('tok')

    await expect(me()).resolves.toEqual({ id: 'c1', nome: 'Ana', email: 'ana@exemplo.com' })
  })

  it('me com 401 vira NaoAutenticadoError ("Sua sessão expirou")', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(401))
    definirTokenDaSessao('tok')

    const erro = await me().catch((e) => e)

    expect(erro).toBeInstanceOf(NaoAutenticadoError)
    expect(erro.message).toBe('Sua sessão expirou')
  })
})
