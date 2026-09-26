import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buscarCep } from '../login/service/cep.service.js'

function startStubViaCep() {
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')

    if (req.url === '/01310100/json/') {
      res.writeHead(200)
      res.end(
        JSON.stringify({
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
        }),
      )
      return
    }

    if (req.url === '/00000000/json/') {
      res.writeHead(200)
      res.end(JSON.stringify({ erro: true }))
      return
    }

    res.writeHead(500)
    res.end(JSON.stringify({ error: 'erro inesperado' }))
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` })
    })
  })
}

describe('cep.service', () => {
  let server
  let baseUrl

  beforeAll(async () => {
    ;({ server, baseUrl } = await startStubViaCep())
  })

  afterAll(() => {
    server.close()
  })

  it('busca um CEP válido e normaliza logradouro/bairro/cidade/estado', async () => {
    const endereco = await buscarCep('01310100', baseUrl)

    expect(endereco).toEqual({
      logradouro: 'Avenida Paulista',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
    })
  })

  it('retorna null quando o CEP não existe (ViaCEP responde { erro: true })', async () => {
    const endereco = await buscarCep('00000000', baseUrl)

    expect(endereco).toBeNull()
  })

  it('retorna null quando a resposta não é ok', async () => {
    const endereco = await buscarCep('99999999', baseUrl)

    expect(endereco).toBeNull()
  })

  it('retorna null quando a requisição falha (rede indisponível)', async () => {
    const endereco = await buscarCep('01310100', 'http://127.0.0.1:1')

    expect(endereco).toBeNull()
  })
})
