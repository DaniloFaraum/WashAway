import { createServer } from 'node:http'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  cancelarSolicitacaoExclusao,
  getSolicitacaoExclusao,
  solicitarExclusao,
} from '../pages/minha-empresa/service/minhaEmpresa.service.js'
import { limparSessao, setToken } from '../login/sessao.storage.js'

// i17-interno-exclusao: a empresa logada solicita, vê e cancela a exclusão.
// Stub mínimo de /lavaRapidos/me/solicitacao-exclusao, no estilo de
// onboarding.service.test.js (o json-server não tem essas regras).
const ROTA = '/lavaRapidos/me/solicitacao-exclusao'

function startStubBackend() {
  const estado = { solicitacao: null, sequencia: 0, chamadas: [] }

  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      const payload = body ? JSON.parse(body) : {}
      estado.chamadas.push({ method: req.method, url: req.url, authorization: req.headers.authorization ?? null, payload })
      res.setHeader('Content-Type', 'application/json')
      const send = (status, data) => {
        res.writeHead(status)
        res.end(JSON.stringify(data))
      }

      if (req.url !== ROTA) return send(404, { error: 'Not found' })
      if (!req.headers.authorization) return send(401, { error: 'Token de acesso ausente' })

      if (req.method === 'GET') {
        return estado.solicitacao ? send(200, estado.solicitacao) : send(404, { error: 'Nenhuma solicitação de exclusão' })
      }
      if (req.method === 'POST') {
        if (payload.motivo !== undefined && typeof payload.motivo !== 'string') return send(400, { error: 'motivo deve ser um texto' })
        if (estado.solicitacao?.status === 'pendente') return send(200, estado.solicitacao)
        estado.sequencia += 1
        estado.solicitacao = {
          id: `sx-${estado.sequencia}`,
          lavaRapidoId: 'lr-1',
          nome: 'Empresa',
          cnpj: '11111111000111',
          email: 'empresa@exemplo.com',
          motivo: payload.motivo ?? null,
          status: 'pendente',
          criadoEm: '2026-10-17T12:00:00.000Z',
          decididoEm: null,
          decididoPorId: null,
          observacao: null,
        }
        return send(201, estado.solicitacao)
      }
      if (req.method === 'DELETE') {
        if (estado.solicitacao?.status !== 'pendente') return send(404, { error: 'Nenhuma solicitação de exclusão pendente' })
        estado.solicitacao = { ...estado.solicitacao, status: 'cancelada', decididoEm: '2026-10-17T13:00:00.000Z' }
        return send(200, estado.solicitacao)
      }
      return send(404, { error: 'Not found' })
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, baseUrl: `http://127.0.0.1:${port}`, estado })
    })
  })
}

describe('minhaEmpresa.service (solicitação de exclusão)', () => {
  let server
  let baseUrl
  let estado

  beforeAll(async () => {
    ;({ server, baseUrl, estado } = await startStubBackend())
  })

  afterAll(() => {
    server.close()
  })

  afterEach(() => {
    limparSessao()
  })

  it('sem solicitação, getSolicitacaoExclusao devolve null (404 não é erro)', async () => {
    setToken('token-da-empresa')

    expect(await getSolicitacaoExclusao(baseUrl)).toBeNull()
    expect(estado.chamadas.at(-1)).toMatchObject({ method: 'GET', url: ROTA, authorization: 'Bearer token-da-empresa' })
  })

  it('solicita com o motivo aparado; a segunda devolve a mesma pendente', async () => {
    setToken('token-da-empresa')

    const primeira = await solicitarExclusao('  Vou fechar  ', baseUrl)
    const segunda = await solicitarExclusao('', baseUrl)

    expect(primeira).toEqual({
      id: 'sx-1',
      status: 'pendente',
      motivo: 'Vou fechar',
      observacao: null,
      criadoEm: '2026-10-17T12:00:00.000Z',
      decididoEm: null,
    })
    expect(segunda.id).toBe('sx-1')
    // Motivo vazio não vai no body.
    expect(estado.chamadas.at(-1).payload).toEqual({})
    expect((await getSolicitacaoExclusao(baseUrl)).status).toBe('pendente')
  })

  it('cancela a pendente; cancelar de novo lança erro', async () => {
    setToken('token-da-empresa')

    const cancelada = await cancelarSolicitacaoExclusao(baseUrl)

    expect(cancelada).toMatchObject({ id: 'sx-1', status: 'cancelada', decididoEm: '2026-10-17T13:00:00.000Z' })
    expect((await getSolicitacaoExclusao(baseUrl)).status).toBe('cancelada')
    await expect(cancelarSolicitacaoExclusao(baseUrl)).rejects.toThrow('Não há solicitação de exclusão pendente.')
  })

  it('erro do backend vira Error com a mensagem dele', async () => {
    // Sem token: o stub responde 401 (o httpClient avisa a sessão expirada).
    await expect(solicitarExclusao('motivo', baseUrl)).rejects.toThrow('Token de acesso ausente')
    await expect(getSolicitacaoExclusao(baseUrl)).rejects.toThrow('Token de acesso ausente')
  })
})
