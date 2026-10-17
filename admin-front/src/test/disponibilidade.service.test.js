import { createServer } from 'node:http'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  getIntercorrencias,
  createIntercorrencia,
  salvarHorarios,
} from '../pages/disponibilidade/service/disponibilidade.service.js'
import { limparSessao, setEmpresaLogadaId, setToken } from '../login/sessao.storage.js'
import { TEST_SERVER_URL } from './setup/testServerConfig.js'

describe('disponibilidade.service', () => {
  afterEach(() => {
    limparSessao()
  })

  it('getIntercorrencias busca as intercorrências do json-server de teste', async () => {
    const intercorrencias = await getIntercorrencias()

    expect(intercorrencias).toHaveLength(1)
    expect(intercorrencias[0]).toMatchObject({
      id: '1',
      data: '2026-10-12',
      motivo: 'Feriado',
      diaInteiro: true,
    })
  })

  it('getIntercorrencias filtra pelo lavaRapidoId da sessão quando há uma empresa logada', async () => {
    setEmpresaLogadaId('lr-2')

    const intercorrencias = await getIntercorrencias()

    expect(intercorrencias).toHaveLength(0)
  })

  it('createIntercorrencia cria uma intercorrência com período de horário no json-server de teste, sem lavaRapidoId (a empresa vem do token)', async () => {
    setEmpresaLogadaId('lr-1')

    const nova = await createIntercorrencia({
      data: '2026-09-25',
      motivo: 'Falta de energia',
      diaInteiro: false,
      horaInicio: '14:00',
      horaFim: '16:00',
    })

    expect(nova).toMatchObject({
      data: '2026-09-25',
      motivo: 'Falta de energia',
      diaInteiro: false,
      horaInicio: '14:00',
      horaFim: '16:00',
    })

    const gravada = await (await fetch(`${TEST_SERVER_URL}/intercorrencias/${nova.id}`)).json()
    expect(gravada).not.toHaveProperty('lavaRapidoId')
  })
})

// Stub do backend real para o PUT do horário (o json-server não tem a rota aninhada).
function startStubBackend(requisicoes) {
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      const payload = body ? JSON.parse(body) : {}
      requisicoes.push({ method: req.method, url: req.url, authorization: req.headers.authorization, payload })
      res.setHeader('Content-Type', 'application/json')
      const send = (status, data) => {
        res.writeHead(status)
        res.end(JSON.stringify(data))
      }

      if (req.method === 'PUT' && req.url === '/lavaRapidos/lr-1/horarios') {
        const segunda = payload.dias.find((dia) => dia.diaSemana === 1)
        if (segunda && !segunda.fechado && segunda.abertura >= segunda.fechamento) {
          return send(400, { error: 'Abertura de segunda deve ser antes do fechamento' })
        }
        return send(
          200,
          payload.dias.map((dia) => ({
            diaSemana: dia.diaSemana,
            fechado: dia.fechado,
            abertura: dia.abertura ?? null,
            fechamento: dia.fechamento ?? null,
            definido: true,
          })),
        )
      }
      if (req.method === 'PUT') return send(404, { error: 'Lava-rápido não encontrado' })
      send(404, { error: 'not found' })
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` })
    })
  })
}

describe('disponibilidade.service — salvarHorarios', () => {
  const requisicoes = []
  let server
  let baseUrl

  const semana = [
    { diaSemana: 0, fechado: true },
    ...[1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, fechado: false, abertura: '08:00', fechamento: '18:00' })),
    { diaSemana: 6, fechado: false, abertura: '08:00', fechamento: '12:00' },
  ]

  beforeAll(async () => {
    ;({ server, baseUrl } = await startStubBackend(requisicoes))
  })

  afterAll(() => {
    server.close()
  })

  afterEach(() => {
    limparSessao()
    requisicoes.length = 0
  })

  it('faz PUT /lavaRapidos/:id/horarios da empresa da sessão, com o token e os 7 dias', async () => {
    setEmpresaLogadaId('lr-1')
    setToken('token-do-lava-rapido')

    const horarios = await salvarHorarios(semana, baseUrl)

    expect(requisicoes).toHaveLength(1)
    expect(requisicoes[0]).toMatchObject({
      method: 'PUT',
      url: '/lavaRapidos/lr-1/horarios',
      authorization: 'Bearer token-do-lava-rapido',
      payload: { dias: semana },
    })
    expect(horarios).toHaveLength(7)
    expect(horarios[0]).toEqual({ diaSemana: 0, fechado: true, abertura: null, fechamento: null, definido: true })
    expect(horarios[6]).toEqual({ diaSemana: 6, fechado: false, abertura: '08:00', fechamento: '12:00', definido: true })
  })

  it('repassa a mensagem do backend no erro de validação (400)', async () => {
    setEmpresaLogadaId('lr-1')
    setToken('token-do-lava-rapido')
    const invalida = semana.map((dia) => (dia.diaSemana === 1 ? { ...dia, abertura: '18:00', fechamento: '08:00' } : dia))

    await expect(salvarHorarios(invalida, baseUrl)).rejects.toThrow('Abertura de segunda deve ser antes do fechamento')
  })

  it('repassa a mensagem do 404 (empresa diferente da do token)', async () => {
    setEmpresaLogadaId('lr-2')
    setToken('token-do-lava-rapido')

    await expect(salvarHorarios(semana, baseUrl)).rejects.toThrow('Lava-rápido não encontrado')
  })
})
