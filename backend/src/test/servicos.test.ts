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
  let itemLavagemId: string
  let itemSecagemId: string
  let itemInativoId: string

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

    itemLavagemId = (
      await prisma.itemServico.create({ data: { nome: 'Item teste lavagem', descricao: 'teste', categoria: 'Lavagem teste', duracaoMinutos: 20 } })
    ).id
    itemSecagemId = (
      await prisma.itemServico.create({ data: { nome: 'Item teste secagem', descricao: 'teste', categoria: 'Secagem teste', duracaoMinutos: 10 } })
    ).id
    itemInativoId = (
      await prisma.itemServico.create({
        data: { nome: 'Item teste inativo', descricao: 'teste', categoria: 'Lavagem teste', duracaoMinutos: 15, ativo: false },
      })
    ).id

    const servico = await prisma.servico.create({
      data: { lavaRapidoId, nome: 'Lavagem de teste', preco: 40, ativo: true, itens: { create: [{ itemId: itemLavagemId }] } },
    })
    servicoId = servico.id

    await prisma.servico.create({
      data: { lavaRapidoId: outroLavaRapidoId, nome: 'Serviço de outra empresa', preco: 30, ativo: true },
    })
  })

  afterAll(async () => {
    await prisma.servico.deleteMany({ where: { lavaRapidoId: { in: [lavaRapidoId, outroLavaRapidoId] } } })
    await prisma.itemServico.deleteMany({ where: { id: { in: [itemLavagemId, itemSecagemId, itemInativoId] } } })
    await prisma.lavaRapido.deleteMany({ where: { id: { in: [lavaRapidoId, outroLavaRapidoId] } } })
    await prisma.$disconnect()
  })

  it('GET /servicos?lavaRapidoId= filtra só os serviços daquele lava-rápido', async () => {
    const response = await supertest(app).get('/servicos').query({ lavaRapidoId })

    expect(response.status).toBe(200)
    expect(response.body.every((item: { lavaRapidoId: string }) => item.lavaRapidoId === lavaRapidoId)).toBe(true)
    expect(response.body.some((item: { id: string }) => item.id === servicoId)).toBe(true)
  })

  it('GET /servicos traz os itens do combo e as categorias derivadas deles', async () => {
    const response = await supertest(app).get('/servicos').query({ lavaRapidoId })

    const servico = response.body.find((item: { id: string }) => item.id === servicoId)
    expect(servico.itens).toEqual([{ id: itemLavagemId, nome: 'Item teste lavagem', categoria: 'Lavagem teste', duracaoMinutos: 20 }])
    expect(servico.duracaoMinutos).toBe(20)
    expect(servico.categorias).toEqual(['Lavagem teste'])
  })

  it('POST /servicos cria um combo com itens do catálogo', async () => {
    const response = await supertest(app)
      .post('/servicos')
      .send({ lavaRapidoId, nome: '  Combo de teste  ', preco: 55, itemIds: [itemLavagemId, itemSecagemId] })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ lavaRapidoId, nome: 'Combo de teste', preco: 55, ativo: true })
    expect(response.body.itens.map((item: { id: string }) => item.id).sort()).toEqual([itemLavagemId, itemSecagemId].sort())
    expect(response.body.categorias.sort()).toEqual(['Lavagem teste', 'Secagem teste'])
    expect(response.body.duracaoMinutos).toBe(30)
  })

  it.each([
    ['lista de itens vazia', { nome: 'X', preco: 10, itemIds: [] }],
    ['preço zero', { nome: 'X', preco: 0, itemIds: ['qualquer'] }],
    ['nome vazio', { nome: ' ', preco: 10, itemIds: ['qualquer'] }],
    ['itens repetidos', { nome: 'X', preco: 10, itemIds: ['a', 'a'] }],
  ])('POST /servicos rejeita %s com 400', async (_caso, body) => {
    const response = await supertest(app).post('/servicos').send({ lavaRapidoId, ...body })

    expect(response.status).toBe(400)
  })

  it('POST /servicos rejeita item inexistente ou inativo no catálogo, listando os ids inválidos', async () => {
    const response = await supertest(app)
      .post('/servicos')
      .send({ lavaRapidoId, nome: 'Massagem', preco: 10, itemIds: [itemLavagemId, itemInativoId, 'item-que-nao-existe'] })

    expect(response.status).toBe(400)
    expect(response.body.itemIdsInvalidos).toEqual([itemInativoId, 'item-que-nao-existe'])
  })

  it('POST /servicos retorna 404 para um lava-rápido inexistente', async () => {
    const response = await supertest(app)
      .post('/servicos')
      .send({ lavaRapidoId: 'lava-rapido-que-nao-existe', nome: 'X', preco: 10, itemIds: [itemLavagemId] })

    expect(response.status).toBe(404)
  })

  it('PUT /servicos/:id troca nome, preço e itens do combo', async () => {
    const response = await supertest(app)
      .put(`/servicos/${servicoId}`)
      .send({ nome: 'Lavagem de teste editada', preco: 45, itemIds: [itemSecagemId] })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: servicoId, nome: 'Lavagem de teste editada', preco: 45 })
    expect(response.body.itens.map((item: { id: string }) => item.id)).toEqual([itemSecagemId])
    expect(response.body.duracaoMinutos).toBe(10)
  })

  it('PUT /servicos/:id retorna 404 para um serviço inexistente', async () => {
    const response = await supertest(app)
      .put('/servicos/id-que-nao-existe')
      .send({ nome: 'X', preco: 10, itemIds: [itemLavagemId] })

    expect(response.status).toBe(404)
  })

  it('PATCH /servicos/:id atualiza só o ativo', async () => {
    const response = await supertest(app).patch(`/servicos/${servicoId}`).send({ ativo: false })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: servicoId, ativo: false, nome: 'Lavagem de teste editada' })
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
