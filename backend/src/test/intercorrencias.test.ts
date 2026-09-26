import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import * as intercorrenciasService from '../modules/intercorrencias/intercorrencias.service.js'

const app = createApp()

describe('/intercorrencias', () => {
  let lavaRapidoId: string
  let intercorrenciaId: string

  beforeAll(async () => {
    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido da intercorrência de teste',
        cnpj: '44444444000155',
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

    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: '2026-10-12', motivo: 'Feriado', diaInteiro: true },
    })
    intercorrenciaId = intercorrencia.id
  })

  afterAll(async () => {
    await prisma.intercorrencia.deleteMany({ where: { lavaRapidoId } })
    await prisma.lavaRapido.deleteMany({ where: { id: lavaRapidoId } })
    await prisma.$disconnect()
  })

  it('GET /intercorrencias?lavaRapidoId= filtra e devolve data como string "YYYY-MM-DD"', async () => {
    const response = await supertest(app).get('/intercorrencias').query({ lavaRapidoId })

    expect(response.status).toBe(200)
    const item = response.body.find((i: { id: string }) => i.id === intercorrenciaId)
    expect(item).toMatchObject({ data: '2026-10-12', motivo: 'Feriado', diaInteiro: true })
  })

  it('POST /intercorrencias cria uma intercorrência de dia inteiro', async () => {
    const response = await supertest(app)
      .post('/intercorrencias')
      .send({ lavaRapidoId, data: '2026-11-01', motivo: 'Manutenção', diaInteiro: true })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ data: '2026-11-01', motivo: 'Manutenção', diaInteiro: true })
  })

  it('POST /intercorrencias cria uma intercorrência parcial com horaInicio/horaFim', async () => {
    const response = await supertest(app).post('/intercorrencias').send({
      lavaRapidoId,
      data: '2026-09-25',
      motivo: 'Falta de energia',
      diaInteiro: false,
      horaInicio: '14:00',
      horaFim: '16:00',
    })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ diaInteiro: false, horaInicio: '14:00', horaFim: '16:00' })
  })

  it('POST /intercorrencias rejeita horaInicio/horaFim quando diaInteiro é true', async () => {
    const response = await supertest(app).post('/intercorrencias').send({
      lavaRapidoId,
      data: '2026-12-25',
      motivo: 'Natal',
      diaInteiro: true,
      horaInicio: '08:00',
    })

    expect(response.status).toBe(400)
  })

  it('POST /intercorrencias retorna 400 (não 500) quando lavaRapidoId não corresponde a nenhuma empresa', async () => {
    const response = await supertest(app).post('/intercorrencias').send({
      lavaRapidoId: 'id-que-nao-existe',
      data: '2026-12-25',
      motivo: 'Natal',
      diaInteiro: true,
    })

    expect(response.status).toBe(400)
  })

  it('POST /intercorrencias rejeita quando diaInteiro é false sem horaInicio/horaFim', async () => {
    const response = await supertest(app).post('/intercorrencias').send({
      lavaRapidoId,
      data: '2026-12-26',
      motivo: 'Sem horário',
      diaInteiro: false,
    })

    expect(response.status).toBe(400)
  })

  describe('erro inesperado', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('GET /intercorrencias retorna 500 em vez de derrubar o processo quando o acesso a dados falha', async () => {
      vi.spyOn(intercorrenciasService, 'listIntercorrencias').mockRejectedValueOnce(new Error('falha inesperada no banco'))

      const response = await supertest(app).get('/intercorrencias')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: 'Erro interno' })
    })
  })
})
