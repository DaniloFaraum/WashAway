import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import * as pedidosService from '../modules/pedidos/pedidos.service.js'
import { criarLavaRapidoTeste, criarPedidoTeste } from './helpers/factories.js'
import { limparDadosDeTeste } from './helpers/limpeza.js'

const app = createApp()

describe('/pedidos', () => {
  let lavaRapidoId: string
  let pedidoId: string

  beforeAll(async () => {
    const lavaRapido = await criarLavaRapidoTeste()
    lavaRapidoId = lavaRapido.id

    const pedido = await criarPedidoTeste(lavaRapidoId, { status: 'pendente' })
    pedidoId = pedido.id
  })

  afterAll(async () => {
    await limparDadosDeTeste()
    await prisma.$disconnect()
  })

  it('GET /pedidos lista os pedidos, com o lavaRapidoId do lava-rápido real', async () => {
    const response = await supertest(app).get('/pedidos')

    expect(response.status).toBe(200)
    const pedido = response.body.find((item: { id: string }) => item.id === pedidoId)
    expect(pedido).toMatchObject({ lavaRapidoId, status: 'pendente' })
  })

  it('GET /pedidos?lavaRapidoId= filtra só os pedidos daquele lava-rápido', async () => {
    const response = await supertest(app).get('/pedidos').query({ lavaRapidoId })

    expect(response.status).toBe(200)
    expect(response.body.every((item: { lavaRapidoId: string }) => item.lavaRapidoId === lavaRapidoId)).toBe(true)
    expect(response.body.some((item: { id: string }) => item.id === pedidoId)).toBe(true)
  })

  it('GET /pedidos?lavaRapidoId= com id que não tem pedido retorna lista vazia', async () => {
    const response = await supertest(app).get('/pedidos').query({ lavaRapidoId: 'id-sem-pedidos' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it('GET /pedidos?lavaRapidoId= repetido usa o primeiro valor em vez de ignorar o filtro', async () => {
    const response = await supertest(app)
      .get('/pedidos')
      .query({ lavaRapidoId: [lavaRapidoId, 'id-sem-pedidos'] })

    expect(response.status).toBe(200)
    expect(response.body.every((item: { lavaRapidoId: string }) => item.lavaRapidoId === lavaRapidoId)).toBe(true)
  })

  it('PATCH /pedidos/:id atualiza o status', async () => {
    const response = await supertest(app)
      .patch(`/pedidos/${pedidoId}`)
      .send({ status: 'em_andamento' })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('em_andamento')
  })

  it('PATCH /pedidos/:id rejeita um status inválido', async () => {
    const response = await supertest(app)
      .patch(`/pedidos/${pedidoId}`)
      .send({ status: 'inexistente' })

    expect(response.status).toBe(400)
  })

  it('PATCH /pedidos/:id retorna 404 para um pedido inexistente', async () => {
    const response = await supertest(app)
      .patch('/pedidos/id-que-nao-existe')
      .send({ status: 'concluido' })

    expect(response.status).toBe(404)
  })

  describe('erro inesperado', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('GET /pedidos retorna 500 em vez de derrubar o processo quando o acesso a dados falha', async () => {
      vi.spyOn(pedidosService, 'listPedidos').mockRejectedValueOnce(new Error('falha inesperada no banco'))

      const response = await supertest(app).get('/pedidos')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: 'Erro interno' })
    })
  })
})
