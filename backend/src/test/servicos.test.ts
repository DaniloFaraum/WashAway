import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import * as servicosService from '../modules/servicos/servicos.service.js'
import { comToken, tokenDeLavaRapido } from './helpers/auth.js'

const app = createApp()

describe('/servicos', () => {
  let lavaRapidoId: string
  let token: string
  let outroLavaRapidoId: string
  let servicoDeOutraEmpresaId: string
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
    token = tokenDeLavaRapido(lavaRapido)

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

    servicoDeOutraEmpresaId = (
      await prisma.servico.create({
        data: { lavaRapidoId: outroLavaRapidoId, nome: 'Serviço de outra empresa', preco: 30, ativo: true },
      })
    ).id
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

  it('POST /servicos cria um combo com itens do catálogo, na empresa do token', async () => {
    const response = await comToken(supertest(app).post('/servicos'), token)
      .send({ nome: '  Combo de teste  ', preco: 55, itemIds: [itemLavagemId, itemSecagemId] })

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
    ['preço acima do teto de R$ 5.000,00', { nome: 'X', preco: 5000.01, itemIds: ['qualquer'] }],
    ['preço absurdo', { nome: 'X', preco: 99999999, itemIds: ['qualquer'] }],
    ['preço com 3 casas decimais', { nome: 'X', preco: 10.555, itemIds: ['qualquer'] }],
  ])('POST /servicos rejeita %s com 400', async (_caso, body) => {
    const response = await comToken(supertest(app).post('/servicos'), token).send(body)

    expect(response.status).toBe(400)
  })

  it('POST /servicos aceita o preço no teto (R$ 5.000,00) e com 2 casas decimais', async () => {
    const teto = await comToken(supertest(app).post('/servicos'), token).send({ nome: 'Combo no teto', preco: 5000, itemIds: [itemLavagemId] })
    const centavos = await comToken(supertest(app).post('/servicos'), token).send({ nome: 'Combo com centavos', preco: 49.9, itemIds: [itemLavagemId] })

    expect(teto.status).toBe(201)
    expect(centavos.status).toBe(201)
    expect(centavos.body.preco).toBe(49.9)
  })

  it('POST /servicos recusa nome repetido na mesma empresa (sem diferenciar maiúsculas nem espaços nas pontas) com 409', async () => {
    const criado = await comToken(supertest(app).post('/servicos'), token).send({ nome: 'Combo único', preco: 20, itemIds: [itemLavagemId] })
    const repetido = await comToken(supertest(app).post('/servicos'), token).send({ nome: '  COMBO ÚNICO ', preco: 25, itemIds: [itemLavagemId] })

    expect(criado.status).toBe(201)
    expect(repetido.status).toBe(409)
    expect(repetido.body.error).toBe('Já existe um serviço com esse nome')
    expect(await prisma.servico.count({ where: { lavaRapidoId, nome: { equals: 'Combo único', mode: 'insensitive' } } })).toBe(1)
  })

  it('POST /servicos aceita um nome que só existe em outra empresa', async () => {
    const response = await comToken(supertest(app).post('/servicos'), token)
      .send({ nome: 'Serviço de outra empresa', preco: 30, itemIds: [itemLavagemId] })

    expect(response.status).toBe(201)
  })

  it('PUT /servicos/:id recusa o nome de outro serviço da empresa (409), mas deixa salvar mantendo o próprio nome', async () => {
    const a = await comToken(supertest(app).post('/servicos'), token).send({ nome: 'Combo A (nomes)', preco: 20, itemIds: [itemLavagemId] })
    const b = await comToken(supertest(app).post('/servicos'), token).send({ nome: 'Combo B (nomes)', preco: 20, itemIds: [itemLavagemId] })

    const roubando = await comToken(supertest(app).put(`/servicos/${b.body.id}`), token)
      .send({ nome: 'combo a (nomes)', preco: 20, itemIds: [itemLavagemId] })
    const mesmoNome = await comToken(supertest(app).put(`/servicos/${a.body.id}`), token)
      .send({ nome: 'Combo A (nomes)', preco: 22, itemIds: [itemLavagemId] })

    expect(roubando.status).toBe(409)
    expect(await prisma.servico.findUnique({ where: { id: b.body.id } })).toMatchObject({ nome: 'Combo B (nomes)' })
    expect(mesmoNome.status).toBe(200)
    expect(mesmoNome.body.preco).toBe(22)
  })

  it('PUT /servicos/:id de outra empresa responde 404 mesmo com um nome que já existe na minha empresa', async () => {
    const response = await comToken(supertest(app).put(`/servicos/${servicoDeOutraEmpresaId}`), token)
      .send({ nome: 'Combo único', preco: 20, itemIds: [itemLavagemId] })

    expect(response.status).toBe(404)
  })

  it('POST /servicos rejeita item inexistente ou inativo no catálogo, listando os ids inválidos', async () => {
    const response = await comToken(supertest(app).post('/servicos'), token)
      .send({ nome: 'Massagem', preco: 10, itemIds: [itemLavagemId, itemInativoId, 'item-que-nao-existe'] })

    expect(response.status).toBe(400)
    expect(response.body.itemIdsInvalidos).toEqual([itemInativoId, 'item-que-nao-existe'])
  })

  it('POST /servicos ignora body.lavaRapidoId: cria na empresa do token', async () => {
    const response = await comToken(supertest(app).post('/servicos'), token)
      .send({ lavaRapidoId: outroLavaRapidoId, nome: 'Combo com id de outra empresa', preco: 10, itemIds: [itemLavagemId] })

    expect(response.status).toBe(201)
    expect(response.body.lavaRapidoId).toBe(lavaRapidoId)
  })

  it('PUT e PATCH /servicos/:id de outra empresa retornam 404 e não alteram o serviço', async () => {
    const put = await comToken(supertest(app).put(`/servicos/${servicoDeOutraEmpresaId}`), token)
      .send({ nome: 'Invadido', preco: 1, itemIds: [itemLavagemId] })
    const patch = await comToken(supertest(app).patch(`/servicos/${servicoDeOutraEmpresaId}`), token).send({ ativo: false })

    expect(put.status).toBe(404)
    expect(patch.status).toBe(404)
    expect(await prisma.servico.findUnique({ where: { id: servicoDeOutraEmpresaId } })).toMatchObject({ nome: 'Serviço de outra empresa', ativo: true })
  })

  it('PUT /servicos/:id troca nome, preço e itens do combo', async () => {
    const response = await comToken(supertest(app).put(`/servicos/${servicoId}`), token)
      .send({ nome: 'Lavagem de teste editada', preco: 45, itemIds: [itemSecagemId] })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: servicoId, nome: 'Lavagem de teste editada', preco: 45 })
    expect(response.body.itens.map((item: { id: string }) => item.id)).toEqual([itemSecagemId])
    expect(response.body.duracaoMinutos).toBe(10)
  })

  it('PUT /servicos/:id retorna 404 para um serviço inexistente', async () => {
    const response = await comToken(supertest(app).put('/servicos/id-que-nao-existe'), token)
      .send({ nome: 'X', preco: 10, itemIds: [itemLavagemId] })

    expect(response.status).toBe(404)
  })

  it('PATCH /servicos/:id atualiza só o ativo', async () => {
    const response = await comToken(supertest(app).patch(`/servicos/${servicoId}`), token).send({ ativo: false })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: servicoId, ativo: false, nome: 'Lavagem de teste editada' })
  })

  it('PATCH /servicos/:id rejeita body com outros campos além de ativo', async () => {
    const response = await comToken(supertest(app).patch(`/servicos/${servicoId}`), token).send({ ativo: true, preco: 999 })

    expect(response.status).toBe(400)
  })

  it('PATCH /servicos/:id retorna 404 para um serviço inexistente', async () => {
    const response = await comToken(supertest(app).patch('/servicos/id-que-nao-existe'), token).send({ ativo: true })

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
