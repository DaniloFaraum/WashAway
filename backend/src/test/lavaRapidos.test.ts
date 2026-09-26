import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'

const app = createApp()

describe('GET /lavaRapidos', () => {
  let lavaRapidoId: string

  beforeAll(async () => {
    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido de teste',
        cnpj: '11111111000111',
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
  })

  afterAll(async () => {
    await prisma.lavaRapido.deleteMany({ where: { id: lavaRapidoId } })
    await prisma.$disconnect()
  })

  it('lista os lava-rápidos cadastrados', async () => {
    const response = await supertest(app).get('/lavaRapidos')

    expect(response.status).toBe(200)
    expect(response.body.some((item: { id: string }) => item.id === lavaRapidoId)).toBe(true)
  })

  it('busca um lava-rápido por id', async () => {
    const response = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: lavaRapidoId, name: 'Lava-rápido de teste' })
  })

  it('não inclui senha na listagem', async () => {
    const response = await supertest(app).get('/lavaRapidos')

    const item = response.body.find((entry: { id: string }) => entry.id === lavaRapidoId)
    expect(item.senha).toBeUndefined()
  })

  it('não inclui senha na busca por id', async () => {
    const response = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)

    expect(response.body.senha).toBeUndefined()
  })

  it('retorna 404 para um id inexistente', async () => {
    const response = await supertest(app).get('/lavaRapidos/id-que-nao-existe')

    expect(response.status).toBe(404)
  })
})

describe('POST /lavaRapidos (cadastro)', () => {
  const cnpjNovo = '33333333000133'

  afterAll(async () => {
    await prisma.lavaRapido.deleteMany({ where: { cnpj: cnpjNovo } })
  })

  it('cadastra uma empresa nova com senha padrão "admin" (hasheada, não em texto puro)', async () => {
    const response = await supertest(app)
      .post('/lavaRapidos')
      .send({ name: 'Empresa de teste', address: 'Rua de teste, 1', cnpj: cnpjNovo })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ name: 'Empresa de teste', cnpj: cnpjNovo })
    expect(response.body.senha).toBeUndefined()

    const noBanco = await prisma.lavaRapido.findUnique({ where: { cnpj: cnpjNovo } })
    expect(noBanco?.senha).not.toBe('admin')
  })

  it('rejeita cnpj com formato inválido', async () => {
    const response = await supertest(app)
      .post('/lavaRapidos')
      .send({ name: 'Empresa inválida', cnpj: '123' })

    expect(response.status).toBe(400)
  })

  it('rejeita cadastro com cnpj duplicado (409)', async () => {
    const response = await supertest(app)
      .post('/lavaRapidos')
      .send({ name: 'Empresa duplicada', cnpj: cnpjNovo })

    expect(response.status).toBe(409)
  })
})

describe('POST /lavaRapidos/login', () => {
  const cnpjLogin = '44444444000144'

  beforeAll(async () => {
    await supertest(app)
      .post('/lavaRapidos')
      .send({ name: 'Empresa de login', cnpj: cnpjLogin })
  })

  afterAll(async () => {
    await prisma.lavaRapido.deleteMany({ where: { cnpj: cnpjLogin } })
  })

  it('loga com cnpj + senha padrão "admin"', async () => {
    const response = await supertest(app)
      .post('/lavaRapidos/login')
      .send({ cnpj: cnpjLogin, senha: 'admin' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ cnpj: cnpjLogin })
    expect(response.body.senha).toBeUndefined()
  })

  it('rejeita senha errada (401)', async () => {
    const response = await supertest(app)
      .post('/lavaRapidos/login')
      .send({ cnpj: cnpjLogin, senha: 'errada' })

    expect(response.status).toBe(401)
  })

  it('rejeita cnpj inexistente (401)', async () => {
    const response = await supertest(app)
      .post('/lavaRapidos/login')
      .send({ cnpj: '99999999000199', senha: 'admin' })

    expect(response.status).toBe(401)
  })
})
