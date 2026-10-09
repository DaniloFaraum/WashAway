import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, definirTokenDaSessao, ErroRede, registrarAoExpirarSessao } from '../services/httpClient'

function resposta(status: number) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({}) } as Response
}

describe('httpClient#apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    definirTokenDaSessao(null)
  })

  it('injeta Authorization: Bearer quando há token', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(resposta(200))
    definirTokenDaSessao('tok-123')

    await apiFetch('/clientes/me')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toEqual(expect.stringContaining('/clientes/me'))
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok-123')
  })

  it('sem token, não envia Authorization', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(resposta(200))

    await apiFetch('/lavaRapidos')

    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('body string ganha Content-Type: application/json', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(resposta(200))

    await apiFetch('/auth/cliente/login', { method: 'POST', body: '{}' })

    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('401 com token chama o handler de sessão expirada', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(401))
    const handler = vi.fn()
    const desfazer = registrarAoExpirarSessao(handler)
    definirTokenDaSessao('tok-expirado')

    const response = await apiFetch('/clientes/me')

    expect(response.status).toBe(401)
    expect(handler).toHaveBeenCalledTimes(1)
    desfazer()
  })

  it('401 sem token (ex.: login errado) não chama o handler', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(401))
    const handler = vi.fn()
    const desfazer = registrarAoExpirarSessao(handler)

    await apiFetch('/auth/cliente/login', { method: 'POST', body: '{}' })

    expect(handler).not.toHaveBeenCalled()
    desfazer()
  })

  it('falha de rede vira ErroRede', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network request failed'))

    await expect(apiFetch('/clientes/me')).rejects.toBeInstanceOf(ErroRede)
  })
})
