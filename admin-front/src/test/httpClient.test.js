import { createServer } from 'node:http'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createHttpClient, definirAoExpirarSessao } from '../services/httpClient.js'
import { limparSessao, setToken } from '../login/sessao.storage.js'

// I17: o cliente HTTP do painel manda o token da sessão e avisa quando o
// backend responde 401 (sessão expirada).
function startStubBackend() {
  const chamadas = []
  const server = createServer((req, res) => {
    chamadas.push({ url: req.url, authorization: req.headers.authorization ?? null })
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/expirada') {
      res.writeHead(401)
      res.end(JSON.stringify({ error: 'Token de acesso inválido ou expirado' }))
      return
    }
    res.writeHead(200)
    res.end(JSON.stringify({ ok: true }))
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, baseUrl: `http://127.0.0.1:${port}`, chamadas })
    })
  })
}

describe('httpClient', () => {
  let server
  let chamadas
  let request

  beforeAll(async () => {
    let baseUrl
    ;({ server, baseUrl, chamadas } = await startStubBackend())
    ;({ request } = createHttpClient(baseUrl))
  })

  afterAll(() => {
    server.close()
  })

  afterEach(() => {
    limparSessao()
    definirAoExpirarSessao(null)
  })

  it('com sessão, envia Authorization: Bearer <token>', async () => {
    setToken('token-da-sessao')

    await request('/qualquer')

    expect(chamadas.at(-1)).toEqual({ url: '/qualquer', authorization: 'Bearer token-da-sessao' })
  })

  it('sem sessão, não envia Authorization', async () => {
    await request('/publica')

    expect(chamadas.at(-1)).toEqual({ url: '/publica', authorization: null })
  })

  it('401 avisa a sessão expirada e lança erro', async () => {
    const aoExpirar = vi.fn()
    definirAoExpirarSessao(aoExpirar)
    setToken('token-vencido')

    await expect(request('/expirada')).rejects.toThrow('401')
    expect(aoExpirar).toHaveBeenCalledTimes(1)
  })
})
