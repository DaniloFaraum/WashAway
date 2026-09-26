import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cadastrar, entrar } from '../login/service/lavaRapidos.service.js'

const CNPJ_EXISTENTE = '11111111000111'
const SENHA_VALIDA = 'admin'

function startStubBackend() {
  const cnpjsCadastrados = new Set([CNPJ_EXISTENTE])

  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      const payload = body ? JSON.parse(body) : {}
      res.setHeader('Content-Type', 'application/json')

      if (req.method === 'POST' && req.url === '/lavaRapidos') {
        if (cnpjsCadastrados.has(payload.cnpj)) {
          res.writeHead(409)
          res.end(JSON.stringify({ error: 'Já existe uma empresa cadastrada com esse cnpj' }))
          return
        }
        cnpjsCadastrados.add(payload.cnpj)
        res.writeHead(201)
        res.end(
          JSON.stringify({
            id: 'lr-nova',
            name: payload.name,
            address: payload.address ?? null,
            senha: 'hash-nao-deveria-vazar',
          }),
        )
        return
      }

      if (req.method === 'POST' && req.url === '/lavaRapidos/login') {
        if (payload.cnpj === CNPJ_EXISTENTE && payload.senha === SENHA_VALIDA) {
          res.writeHead(200)
          res.end(JSON.stringify({ id: 'lr-1', name: 'Lava Rápido Teste', address: 'Rua Teste, 123' }))
          return
        }
        res.writeHead(401)
        res.end(JSON.stringify({ error: 'cnpj ou senha inválidos' }))
        return
      }

      res.writeHead(404)
      res.end(JSON.stringify({ error: 'not found' }))
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

  it('entrar retorna a empresa (sem senha) quando cnpj e senha são válidos', async () => {
    const empresa = await entrar({ cnpj: CNPJ_EXISTENTE, senha: SENHA_VALIDA }, baseUrl)

    expect(empresa).toEqual({
      id: 'lr-1',
      name: 'Lava Rápido Teste',
      address: 'Rua Teste, 123',
      isOpen: false,
      intercorrenciaAtiva: null,
    })
  })

  it('entrar lança erro amigável quando a senha está errada (401)', async () => {
    await expect(entrar({ cnpj: CNPJ_EXISTENTE, senha: 'errada' }, baseUrl)).rejects.toThrow(
      'CNPJ ou senha inválidos.',
    )
  })

  it('entrar lança erro amigável quando o cnpj não existe (401)', async () => {
    await expect(entrar({ cnpj: '99999999000199', senha: SENHA_VALIDA }, baseUrl)).rejects.toThrow(
      'CNPJ ou senha inválidos.',
    )
  })

  it('cadastrar cria a empresa e nunca expõe a senha pro admin-front', async () => {
    const empresa = await cadastrar({ name: 'Nova Empresa', address: 'Rua X, 1', cnpj: '22222222000122' }, baseUrl)

    expect(empresa).toEqual({
      id: 'lr-nova',
      name: 'Nova Empresa',
      address: 'Rua X, 1',
      isOpen: false,
      intercorrenciaAtiva: null,
    })
    expect(empresa.senha).toBeUndefined()
  })

  it('cadastrar lança erro amigável quando o cnpj já existe (409)', async () => {
    await expect(
      cadastrar({ name: 'Duplicada', cnpj: CNPJ_EXISTENTE }, baseUrl),
    ).rejects.toThrow('Já existe uma empresa cadastrada com esse CNPJ.')
  })
})
