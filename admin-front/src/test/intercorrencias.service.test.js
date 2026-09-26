import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { reabrirIntercorrencia } from '../login/service/intercorrencias.service.js'

function startStubBackend() {
  const chamadas = []

  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      chamadas.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null })
      res.setHeader('Content-Type', 'application/json')

      if (req.method === 'PATCH' && req.url === '/intercorrencias/int-1') {
        res.writeHead(200)
        res.end(JSON.stringify({ id: 'int-1', reaberta: true }))
        return
      }

      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Intercorrência não encontrada' }))
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, baseUrl: `http://127.0.0.1:${port}`, chamadas })
    })
  })
}

describe('intercorrencias.service', () => {
  let server
  let baseUrl
  let chamadas

  beforeAll(async () => {
    ;({ server, baseUrl, chamadas } = await startStubBackend())
  })

  afterAll(() => {
    server.close()
  })

  it('manda PATCH { reaberta: true } pro id certo', async () => {
    await reabrirIntercorrencia('int-1', baseUrl)

    expect(chamadas).toContainEqual({
      method: 'PATCH',
      url: '/intercorrencias/int-1',
      body: { reaberta: true },
    })
  })

  it('lança erro quando o id não existe', async () => {
    await expect(reabrirIntercorrencia('id-inexistente', baseUrl)).rejects.toThrow('Não foi possível reabrir.')
  })
})
