import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { entrar } from '../login/service/lavaRapidos.service.js'

const CNPJ_EXISTENTE = '11111111000111'
const CNPJ_BLOQUEADO = '22222222000122'
const SENHA_VALIDA = 'senha-forte-123'

// Stub do backend real: login devolve { token, expiraEm, lavaRapido } (I17).
function startStubBackend() {
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      const payload = body ? JSON.parse(body) : {}
      res.setHeader('Content-Type', 'application/json')
      const send = (status, data) => {
        res.writeHead(status)
        res.end(JSON.stringify(data))
      }

      if (req.method === 'POST' && req.url === '/lavaRapidos/login') {
        if (payload.cnpj === CNPJ_BLOQUEADO) {
          return send(429, { error: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' })
        }
        if (payload.cnpj === CNPJ_EXISTENTE && payload.senha === SENHA_VALIDA) {
          return send(200, {
            token: 'token-do-lava-rapido',
            expiraEm: '2026-10-17T00:00:00.000Z',
            lavaRapido: {
              id: 'lr-1',
              name: 'Lava Rápido Teste',
              address: 'Rua Teste, 123',
              isOpen: true,
              foraDoHorario: false,
              intercorrenciaAtiva: null,
              horarios: [{ diaSemana: 1, fechado: false, abertura: '08:00', fechamento: '18:00', definido: true }],
            },
          })
        }
        return send(401, { error: 'cnpj ou senha inválidos' })
      }

      send(404, { error: 'not found' })
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` })
    })
  })
}

describe('lavaRapidos.service', () => {
  let server
  let baseUrl

  beforeAll(async () => {
    ;({ server, baseUrl } = await startStubBackend())
  })

  afterAll(() => {
    server.close()
  })

  it('entrar devolve o token e a empresa normalizada (com horários) do novo formato { token, lavaRapido }', async () => {
    const sessao = await entrar({ cnpj: CNPJ_EXISTENTE, senha: SENHA_VALIDA }, baseUrl)

    expect(sessao).toEqual({
      token: 'token-do-lava-rapido',
      empresa: {
        id: 'lr-1',
        name: 'Lava Rápido Teste',
        address: 'Rua Teste, 123',
        isOpen: true,
        intercorrenciaAtiva: null,
        foraDoHorario: false,
        horarios: [{ diaSemana: 1, fechado: false, abertura: '08:00', fechamento: '18:00', definido: true }],
      },
    })
  })

  it('entrar lança erro amigável quando a senha está errada (401)', async () => {
    await expect(entrar({ cnpj: CNPJ_EXISTENTE, senha: 'errada' }, baseUrl)).rejects.toThrow('CNPJ ou senha inválidos.')
  })

  it('entrar lança erro amigável quando o cnpj não existe (401)', async () => {
    await expect(entrar({ cnpj: '99999999000199', senha: SENHA_VALIDA }, baseUrl)).rejects.toThrow('CNPJ ou senha inválidos.')
  })

  it('entrar mostra a mensagem do backend quando estoura o limite de tentativas (429)', async () => {
    await expect(entrar({ cnpj: CNPJ_BLOQUEADO, senha: 'qualquer' }, baseUrl)).rejects.toThrow(
      'Muitas tentativas. Aguarde 15 minutos e tente de novo.',
    )
  })
})
