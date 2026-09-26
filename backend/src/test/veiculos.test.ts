import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import * as veiculosService from '../modules/veiculos/veiculos.service.js'

const app = createApp()

describe('/veiculos', () => {
  let lavaRapidoId: string
  const pedidoIds: string[] = []

  beforeAll(async () => {
    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido do veículo de teste',
        cnpj: '55555555000166',
        senha: 'hash-fake-nao-usado-nestes-testes',
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

    // Duas visitas do mesmo carro (mesma placa) — deve deduplicar.
    const pedido1 = await prisma.pedido.create({
      data: {
        lavaRapidoId,
        veiculo: { modelo: 'Fiat Argo', placa: 'VEI1T23' },
        servico: 'Lavagem simples',
        horario: new Date('2026-01-01T10:00:00.000Z'),
        status: 'concluido',
        fotos: [],
      },
    })
    const pedido2 = await prisma.pedido.create({
      data: {
        lavaRapidoId,
        veiculo: { modelo: 'Fiat Argo', placa: 'VEI1T23' },
        servico: 'Lavagem completa',
        horario: new Date('2026-01-02T10:00:00.000Z'),
        status: 'pendente',
        fotos: [],
      },
    })
    const pedido3 = await prisma.pedido.create({
      data: {
        lavaRapidoId,
        veiculo: { modelo: 'VW Gol', placa: 'VEI2T45' },
        servico: 'Lavagem simples',
        horario: new Date('2026-01-03T10:00:00.000Z'),
        status: 'pendente',
        fotos: [],
      },
    })
    pedidoIds.push(pedido1.id, pedido2.id, pedido3.id)
  })

  afterAll(async () => {
    await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } })
    await prisma.lavaRapido.deleteMany({ where: { id: lavaRapidoId } })
    await prisma.$disconnect()
  })

  it('GET /veiculos?lavaRapidoId= deriva veículos distintos dos pedidos, sem duplicar por placa', async () => {
    const response = await supertest(app).get('/veiculos').query({ lavaRapidoId })

    expect(response.status).toBe(200)
    const placas = response.body.map((v: { placa: string }) => v.placa)
    expect(placas.filter((p: string) => p === 'VEI1T23')).toHaveLength(1)
    expect(placas).toContain('VEI2T45')
    expect(response.body).toContainEqual({ id: 'VEI1T23', modelo: 'Fiat Argo', placa: 'VEI1T23' })
  })

  it('GET /veiculos sem lavaRapidoId lista veículos de todas as empresas, incluindo o de teste', async () => {
    const response = await supertest(app).get('/veiculos')

    expect(response.status).toBe(200)
    const placas = response.body.map((v: { placa: string }) => v.placa)
    expect(placas).toContain('VEI1T23')
    expect(placas).toContain('VEI2T45')
  })

  describe('erro inesperado', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('GET /veiculos retorna 500 em vez de derrubar o processo quando o acesso a dados falha', async () => {
      vi.spyOn(veiculosService, 'listVeiculos').mockRejectedValueOnce(new Error('falha inesperada no banco'))

      const response = await supertest(app).get('/veiculos')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: 'Erro interno' })
    })
  })
})
