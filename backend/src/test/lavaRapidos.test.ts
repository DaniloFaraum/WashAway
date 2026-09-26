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

describe('isOpen calculado a partir de intercorrências', () => {
  let lavaRapidoId: string

  function horaFormatada(data: Date): string {
    return data.toTimeString().slice(0, 5)
  }

  beforeAll(async () => {
    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido do teste de isOpen',
        cnpj: '55555555000155',
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
    await prisma.intercorrencia.deleteMany({ where: { lavaRapidoId } })
    await prisma.lavaRapido.deleteMany({ where: { id: lavaRapidoId } })
  })

  it('fica isOpen: false com intercorrência de dia inteiro hoje', async () => {
    const hoje = new Date().toISOString().slice(0, 10)
    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: hoje, motivo: 'Folga', diaInteiro: true },
    })

    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)
    expect(show.body.isOpen).toBe(false)
    expect(show.body.intercorrenciaAtiva).toMatchObject({ id: intercorrencia.id, motivo: 'Folga' })

    const index = await supertest(app).get('/lavaRapidos')
    const item = index.body.find((entry: { id: string }) => entry.id === lavaRapidoId)
    expect(item.isOpen).toBe(false)

    await prisma.intercorrencia.delete({ where: { id: intercorrencia.id } })
  })

  it('fica isOpen: false com intercorrência parcial cujo intervalo inclui o horário atual', async () => {
    const agora = new Date()
    const hoje = agora.toISOString().slice(0, 10)
    const inicio = horaFormatada(new Date(agora.getTime() - 60_000))
    const fim = horaFormatada(new Date(agora.getTime() + 60_000))

    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: hoje, motivo: 'Manutenção', diaInteiro: false, horaInicio: inicio, horaFim: fim },
    })

    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)
    expect(show.body.isOpen).toBe(false)
    expect(show.body.intercorrenciaAtiva?.id).toBe(intercorrencia.id)

    await prisma.intercorrencia.delete({ where: { id: intercorrencia.id } })
  })

  it('não muda isOpen com intercorrência parcial fora do horário atual', async () => {
    const agora = new Date()
    const hoje = agora.toISOString().slice(0, 10)
    const inicio = horaFormatada(new Date(agora.getTime() + 2 * 60 * 60_000))
    const fim = horaFormatada(new Date(agora.getTime() + 3 * 60 * 60_000))

    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: hoje, motivo: 'Mais tarde', diaInteiro: false, horaInicio: inicio, horaFim: fim },
    })

    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)
    expect(show.body.isOpen).toBe(true)
    expect(show.body.intercorrenciaAtiva).toBeNull()

    await prisma.intercorrencia.delete({ where: { id: intercorrencia.id } })
  })

  it('não muda isOpen com intercorrência de outro dia', async () => {
    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: '2099-01-01', motivo: 'Futuro distante', diaInteiro: true },
    })

    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)
    expect(show.body.isOpen).toBe(true)

    await prisma.intercorrencia.delete({ where: { id: intercorrencia.id } })
  })

  it('intercorrência marcada reaberta: true deixa de fechar o isOpen', async () => {
    const hoje = new Date().toISOString().slice(0, 10)
    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: hoje, motivo: 'Folga cancelada', diaInteiro: true },
    })

    const reabrir = await supertest(app).patch(`/intercorrencias/${intercorrencia.id}`).send({ reaberta: true })
    expect(reabrir.status).toBe(200)

    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)
    expect(show.body.isOpen).toBe(true)
    expect(show.body.intercorrenciaAtiva).toBeNull()

    await prisma.intercorrencia.delete({ where: { id: intercorrencia.id } })
  })

  it('lava-rápido com isOpen: false no banco continua false mesmo sem intercorrência', async () => {
    const fechado = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido fechado no cadastro',
        cnpj: '66666666000166',
        senha: 'hash-fake-nao-usado-nestes-testes',
        rating: 0,
        reviewsCount: 0,
        distance: '',
        time: '',
        price: 0,
        isOpen: false,
        image: 'https://placehold.co/300x300?text=Fechado',
        latitude: 0,
        longitude: 0,
      },
    })

    const show = await supertest(app).get(`/lavaRapidos/${fechado.id}`)
    expect(show.body.isOpen).toBe(false)

    await prisma.lavaRapido.delete({ where: { id: fechado.id } })
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
