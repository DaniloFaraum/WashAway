import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import * as servicosService from '../modules/servicos/servicos.service.js'

const app = createApp()

describe('/servicos', () => {
  let lavaRapidoId: string
  let outroLavaRapidoId: string
  let servicoId: string

  beforeAll(async () => {
    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido do serviço de teste',
        cnpj: '33333333000133',
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

    const outroLavaRapido = await prisma.lavaRapido.create({
      data: {
        name: 'Outro lava-rápido de teste',
        cnpj: '33333333000144',
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
    outroLavaRapidoId = outroLavaRapido.id

    const servico = await prisma.servico.create({
      data: { lavaRapidoId, nome: 'Lavagem de teste', categoria: 'Lavagem', preco: 40, ativo: true },
    })
    servicoId = servico.id

    await prisma.servico.create({
      data: { lavaRapidoId: outroLavaRapidoId, nome: 'Serviço de outra empresa', categoria: 'Lavagem', preco: 30, ativo: true },
    })
  })

  afterAll(async () => {
    await prisma.servico.deleteMany({ where: { lavaRapidoId: { in: [lavaRapidoId, outroLavaRapidoId] } } })
    await prisma.lavaRapido.deleteMany({ where: { id: { in: [lavaRapidoId, outroLavaRapidoId] } } })
    await prisma.$disconnect()
  })

  it('GET /servicos?lavaRapidoId= filtra só os serviços daquele lava-rápido', async () => {
    const response = await supertest(app).get('/servicos').query({ lavaRapidoId })

    expect(response.status).toBe(200)
    expect(response.body.every((item: { lavaRapidoId: string }) => item.lavaRapidoId === lavaRapidoId)).toBe(true)
    expect(response.body.some((item: { id: string }) => item.id === servicoId)).toBe(true)
  })

  it('PATCH /servicos/:id atualiza só o ativo', async () => {
    const response = await supertest(app).patch(`/servicos/${servicoId}`).send({ ativo: false })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: servicoId, ativo: false, nome: 'Lavagem de teste' })
  })

  it('PATCH /servicos/:id rejeita body com outros campos além de ativo', async () => {
    const response = await supertest(app).patch(`/servicos/${servicoId}`).send({ ativo: true, preco: 999 })

    expect(response.status).toBe(400)
  })

  it('PATCH /servicos/:id retorna 404 para um serviço inexistente', async () => {
    const response = await supertest(app).patch('/servicos/id-que-nao-existe').send({ ativo: true })

    expect(response.status).toBe(404)
  })

  describe('erro inesperado', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('GET /servicos retorna 500 em vez de derrubar o processo quando o acesso a dados falha', async () => {
      vi.spyOn(servicosService, 'listServicos').mockRejectedValueOnce(new Error('falha inesperada no banco'))

      const response = await supertest(app).get('/servicos')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: 'Erro interno' })
    })
  })
})
