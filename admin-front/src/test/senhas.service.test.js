import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  esqueciSenha,
  MENSAGEM_TROCA_EXPIRADA,
  trocarSenha,
  TrocaDeSenhaExpiradaError,
} from '../login/service/senhas.service.js'

const MENSAGEM_GENERICA = 'Se o e-mail estiver cadastrado, enviaremos uma senha temporária'
const EMAIL_LIMITADO = 'limite@exemplo.com'
const TOKEN_DE_TROCA = 'token-de-troca'
const TOKEN_USADO = 'token-ja-usado'

// Stub mínimo das rotas de senha do painel (i17-senha-gerada), no mesmo estilo
// de onboarding.service.test.js.
function startStubBackend() {
  const chamadas = []
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      const payload = body ? JSON.parse(body) : {}
      chamadas.push({ url: req.url, authorization: req.headers.authorization ?? null, payload })
      res.setHeader('Content-Type', 'application/json')
      const send = (status, data) => {
        res.writeHead(status)
        res.end(JSON.stringify(data))
      }

      if (req.method === 'POST' && req.url === '/auth/lava-rapido/esqueci-senha') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email ?? '')) return send(400, { error: 'email inválido' })
        if (payload.email === EMAIL_LIMITADO) {
          return send(429, { error: 'Muitas tentativas. Aguarde 60 minutos e tente de novo.' })
        }
        return send(200, { mensagem: MENSAGEM_GENERICA })
      }

      if (req.method === 'POST' && req.url === '/auth/lava-rapido/trocar-senha') {
        const token = (req.headers.authorization ?? '').replace(/^Bearer /, '')
        if (token !== TOKEN_DE_TROCA) return send(401, { error: 'Sessão inválida ou expirada. Entre de novo.' })
        if (typeof payload.novaSenha !== 'string' || payload.novaSenha.length < 8) {
          return send(400, { error: 'A senha precisa ter no mínimo 8 caracteres' })
        }
        return send(200, {
          token: 'token-normal',
          expiraEm: '2026-10-24T00:00:00.000Z',
          trocaDeSenhaObrigatoria: false,
          lavaRapido: { id: 'lr-1', name: 'Lava Teste', horarios: [] },
        })
      }

      send(404, { error: 'not found' })
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, chamadas, baseUrl: `http://127.0.0.1:${port}` })
    })
  })
}

describe('senhas.service', () => {
  let server
  let chamadas
  let baseUrl

  beforeAll(async () => {
    ;({ server, chamadas, baseUrl } = await startStubBackend())
  })

  afterAll(() => {
    server.close()
  })

  it('esqueciSenha envia o e-mail e devolve a mensagem genérica do backend', async () => {
    const mensagem = await esqueciSenha('dono@exemplo.com', baseUrl)

    expect(mensagem).toBe(MENSAGEM_GENERICA)
    expect(chamadas.at(-1)).toMatchObject({ url: '/auth/lava-rapido/esqueci-senha', payload: { email: 'dono@exemplo.com' } })
  })

  it('esqueciSenha repassa a mensagem do backend no 429 e no 400', async () => {
    await expect(esqueciSenha(EMAIL_LIMITADO, baseUrl)).rejects.toThrow('Muitas tentativas. Aguarde 60 minutos e tente de novo.')
    await expect(esqueciSenha('nao-e-email', baseUrl)).rejects.toThrow('email inválido')
  })

  it('trocarSenha manda o token de troca e devolve a sessão normal', async () => {
    const sessao = await trocarSenha({ novaSenha: 'nova-senha-123', token: TOKEN_DE_TROCA }, baseUrl)

    expect(chamadas.at(-1)).toMatchObject({
      url: '/auth/lava-rapido/trocar-senha',
      authorization: `Bearer ${TOKEN_DE_TROCA}`,
      payload: { novaSenha: 'nova-senha-123' },
    })
    expect(sessao).toMatchObject({ token: 'token-normal', trocaDeSenhaObrigatoria: false, empresa: { id: 'lr-1' } })
  })

  it('trocarSenha com token expirado/usado (401) lança TrocaDeSenhaExpiradaError', async () => {
    const promessa = trocarSenha({ novaSenha: 'nova-senha-123', token: TOKEN_USADO }, baseUrl)

    await expect(promessa).rejects.toBeInstanceOf(TrocaDeSenhaExpiradaError)
    await expect(promessa).rejects.toThrow(MENSAGEM_TROCA_EXPIRADA)
  })

  it('trocarSenha repassa a mensagem do backend no 400', async () => {
    await expect(trocarSenha({ novaSenha: 'curta', token: TOKEN_DE_TROCA }, baseUrl)).rejects.toThrow(
      'A senha precisa ter no mínimo 8 caracteres',
    )
  })
})
