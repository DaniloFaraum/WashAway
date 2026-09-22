import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import * as pedidosService from '../modules/pedidos/pedidos.service.js'

const app = createApp()

describe('/pedidos', () => {
  let lavaRapidoId: string
  let pedidoId: string

  beforeAll(async () => {
    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido do pedido de teste',
        rating: 4.5,
        reviewsCount: 10,
        distance: '1 km',
        time: '5 min',
        price: 50,
        isOpen: true,
        image: 'https://placehold.co/300x300?text=Teste',
        latitude: 0,
        longitude: 0,
      },
    })
    lavaRapidoId = lavaRapido.id

    const pedido = await prisma.pedido.create({
      data: {
        lavaRapidoId,
        veiculo: { modelo: 'Carro de Teste', placa: 'TST0001' },
        servico: 'Lavagem de teste',
        horario: new Date('2026-01-01T10:00:00.000Z'),
        status: 'pendente',
        fotos: [],
      },
    })
    pedidoId = pedido.id
  })

  afterAll(async () => {
    await prisma.pedido.deleteMany({ where: { id: pedidoId } })
    await prisma.lavaRapido.deleteMany({ where: { id: lavaRapidoId } })
    await prisma.$disconnect()
  })

  it('GET /pedidos lista os pedidos, com o lavaRapidoId do lava-rápido real', async () => {
    const response = await supertest(app).get('/pedidos')

    expect(response.status).toBe(200)
    const pedido = response.body.find((item: { id: string }) => item.id === pedidoId)
    expect(pedido).toMatchObject({ lavaRapidoId, status: 'pendente' })
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
