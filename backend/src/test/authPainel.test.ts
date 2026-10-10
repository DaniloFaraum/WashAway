import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { comToken, tokenDeCliente, tokenDeLavaRapido } from './helpers/auth.js'
import {
  criarClienteTeste,
  criarItemServicoTeste,
  criarLavaRapidoTeste,
  criarPedidoTeste,
  criarServicoTeste,
} from './helpers/factories.js'
import { limparDadosDeTeste, registrarParaLimpeza } from './helpers/limpeza.js'

// I17 — acesso seguro ao painel: rotas de gestão exigem token de lava-rápido
// (401 sem token, 403 com token de cliente), a empresa vem do token e dados de
// outra empresa dão 404; rotas públicas continuam sem token.

const app = createApp()

type Metodo = 'get' | 'post' | 'put' | 'patch'

let empresaA: { id: string }
let empresaB: { id: string }
let tokenA: string
let tokenCliente: string
let pedidoB: string
let servicoB: string
let intercorrenciaB: string

beforeAll(async () => {
  empresaA = await criarLavaRapidoTeste()
  empresaB = await criarLavaRapidoTeste()
  tokenA = tokenDeLavaRapido(empresaA)
  tokenCliente = tokenDeCliente(await criarClienteTeste())

  await criarPedidoTeste(empresaA.id)
  pedidoB = (await criarPedidoTeste(empresaB.id, { status: 'pendente' })).id
  servicoB = (await criarServicoTeste(empresaB.id, { nome: 'Serviço da empresa B' })).id
  const intercorrencia = await prisma.intercorrencia.create({
    data: { lavaRapidoId: empresaB.id, data: '2026-12-31', motivo: 'Da empresa B', diaInteiro: true },
  })
  intercorrenciaB = intercorrencia.id
  registrarParaLimpeza('intercorrencia', intercorrencia.id)
})

afterAll(async () => {
  await limparDadosDeTeste()
  await prisma.$disconnect()
})

// Rotas de gestão do painel (corpo válido o bastante pra só a autenticação decidir).
const rotasDeGestao: [Metodo, () => string, Record<string, unknown>?][] = [
  ['get', () => '/pedidos'],
  ['patch', () => `/pedidos/${pedidoB}`, { status: 'concluido' }],
  ['post', () => '/servicos', { nome: 'X', preco: 10, itemIds: ['x'] }],
  ['put', () => `/servicos/${servicoB}`, { nome: 'X', preco: 10, itemIds: ['x'] }],
  ['patch', () => `/servicos/${servicoB}`, { ativo: false }],
  ['post', () => '/intercorrencias', { data: '2026-12-30', motivo: 'X', diaInteiro: true }],
  ['patch', () => `/intercorrencias/${intercorrenciaB}`, { reaberta: true }],
  ['get', () => '/veiculos'],
]

function chamar(metodo: Metodo, caminho: string, body?: Record<string, unknown>) {
  const req = supertest(app)[metodo](caminho)
  return body ? req.send(body) : req
}

describe('sem token → 401', () => {
  it.each(rotasDeGestao)('%s %s', async (metodo, caminho, body) => {
    const response = await chamar(metodo, caminho(), body)

    expect(response.status).toBe(401)
    expect(response.body.error).toEqual(expect.any(String))
  })

  it('token inválido também → 401', async () => {
    const response = await comToken(supertest(app).get('/pedidos'), 'nao-e-um-token')

    expect(response.status).toBe(401)
  })
})

describe('token de cliente no painel → 403', () => {
  it.each(rotasDeGestao)('%s %s', async (metodo, caminho, body) => {
    const response = await comToken(chamar(metodo, caminho(), body), tokenCliente)

    expect(response.status).toBe(403)
  })
})

describe('token de lava-rápido em rota de cliente → 403', () => {
  it('GET /clientes/me', async () => {
    const response = await comToken(supertest(app).get('/clientes/me'), tokenA)

    expect(response.status).toBe(403)
  })
})

describe('token de outra empresa → 404 (e nada muda)', () => {
  it('PATCH /pedidos/:id', async () => {
    const response = await comToken(supertest(app).patch(`/pedidos/${pedidoB}`), tokenA).send({ status: 'concluido' })

    expect(response.status).toBe(404)
    expect(await prisma.pedido.findUnique({ where: { id: pedidoB } })).toMatchObject({ status: 'pendente' })
  })

  it('PUT e PATCH /servicos/:id', async () => {
    const item = await criarItemServicoTeste()
    const put = await comToken(supertest(app).put(`/servicos/${servicoB}`), tokenA).send({
      nome: 'Invadido',
      preco: 1,
      itemIds: [item.id],
    })
    const patch = await comToken(supertest(app).patch(`/servicos/${servicoB}`), tokenA).send({ ativo: false })

    expect(put.status).toBe(404)
    expect(patch.status).toBe(404)
    expect(await prisma.servico.findUnique({ where: { id: servicoB } })).toMatchObject({ nome: 'Serviço da empresa B', ativo: true })
  })

  it('PATCH /intercorrencias/:id', async () => {
    const response = await comToken(supertest(app).patch(`/intercorrencias/${intercorrenciaB}`), tokenA).send({ reaberta: true })

    expect(response.status).toBe(404)
    expect(await prisma.intercorrencia.findUnique({ where: { id: intercorrenciaB } })).toMatchObject({ reaberta: false })
  })

  it('GET /pedidos?lavaRapidoId=<outra> continua trazendo só os pedidos da empresa do token', async () => {
    const response = await comToken(supertest(app).get('/pedidos').query({ lavaRapidoId: empresaB.id }), tokenA)

    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body.every((pedido: { lavaRapidoId: string }) => pedido.lavaRapidoId === empresaA.id)).toBe(true)
  })
})

describe('rotas públicas continuam sem token', () => {
  it.each([
    ['/lavaRapidos', 200],
    [() => `/lavaRapidos/${empresaB.id}`, 200],
    [() => `/lavaRapidos/${empresaB.id}/horarios`, 200],
    [() => `/servicos?lavaRapidoId=${empresaB.id}`, 200],
    [() => `/intercorrencias?lavaRapidoId=${empresaB.id}`, 200],
    ['/itensServico', 200],
    ['/onboarding/solicitacoes/nao-existe', 404],
    ['/api-docs.json', 200],
  ] as [string | (() => string), number][])('GET %s', async (caminho, status) => {
    const response = await supertest(app).get(typeof caminho === 'function' ? caminho() : caminho)

    expect(response.status).toBe(status)
  })

  it('GET /contratos/vigente responde sem pedir token', async () => {
    const response = await supertest(app).get('/contratos/vigente')

    expect([200, 404]).toContain(response.status)
  })

  it('POST /onboarding/solicitacoes responde sem pedir token (validação, não 401)', async () => {
    const response = await supertest(app).post('/onboarding/solicitacoes').send({})

    expect(response.status).toBe(400)
  })
})
