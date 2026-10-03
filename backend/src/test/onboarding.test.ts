import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'

const app = createApp()

const VERSAO_TESTE = 9101
const CNPJ_NOVO = '22222222000122'
const CNPJ_JA_CADASTRADO = '22222222000133'
const CNPJS = [CNPJ_NOVO, CNPJ_JA_CADASTRADO]

describe('/onboarding/solicitacoes', () => {
  let solicitacaoId: string

  beforeAll(async () => {
    await prisma.contrato.create({
      data: { versao: VERSAO_TESTE, titulo: 'Contrato de teste', conteudo: 'Termos de teste', vigente: true },
    })
    await supertest(app).post('/lavaRapidos').send({ name: 'Já cadastrado', cnpj: CNPJ_JA_CADASTRADO })
  })

  afterAll(async () => {
    await prisma.solicitacaoOnboarding.deleteMany({ where: { cnpj: { in: CNPJS } } })
    await prisma.lavaRapido.deleteMany({ where: { cnpj: { in: CNPJS } } })
    await prisma.contrato.deleteMany({ where: { versao: VERSAO_TESTE } })
    await prisma.$disconnect()
  })

  it('recusa cnpj com formato inválido', async () => {
    const response = await supertest(app).post('/onboarding/solicitacoes').send({ name: 'X', cnpj: '123' })

    expect(response.status).toBe(400)
  })

  it('recusa cnpj que já é um lava-rápido', async () => {
    const response = await supertest(app)
      .post('/onboarding/solicitacoes')
      .send({ name: 'Outro', cnpj: CNPJ_JA_CADASTRADO })

    expect(response.status).toBe(409)
  })

  it('cria a solicitação já aguardando contrato, com o contrato vigente', async () => {
    const response = await supertest(app)
      .post('/onboarding/solicitacoes')
      .send({ name: 'Lava Novo', address: 'Rua A, 1', cnpj: CNPJ_NOVO })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ name: 'Lava Novo', cnpj: CNPJ_NOVO, status: 'aguardando_contrato' })
    expect(response.body.contrato).toMatchObject({ titulo: expect.any(String), conteudo: expect.any(String) })
    solicitacaoId = response.body.id
  })

  it('devolve a mesma solicitação pendente em vez de duplicar', async () => {
    const response = await supertest(app)
      .post('/onboarding/solicitacoes')
      .send({ name: 'Lava Novo', cnpj: CNPJ_NOVO })

    expect(response.status).toBe(200)
    expect(response.body.id).toBe(solicitacaoId)
  })

  it('antes do aceite a empresa não aparece em GET /lavaRapidos nem consegue logar', async () => {
    const lista = await supertest(app).get('/lavaRapidos')
    expect(lista.body.some((item: { cnpj: string }) => item.cnpj === CNPJ_NOVO)).toBe(false)

    const login = await supertest(app).post('/lavaRapidos/login').send({ cnpj: CNPJ_NOVO, senha: 'admin' })
    expect(login.status).toBe(401)
  })

  it('mostra status e contrato da solicitação', async () => {
    const response = await supertest(app).get(`/onboarding/solicitacoes/${solicitacaoId}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: solicitacaoId, status: 'aguardando_contrato' })
    expect(response.body.contrato).toBeDefined()
  })

  it('404 para solicitação inexistente', async () => {
    const response = await supertest(app).get('/onboarding/solicitacoes/nao-existe')

    expect(response.status).toBe(404)
  })

  it('recusa aceite com texto diferente de "eu aceito"', async () => {
    const response = await supertest(app)
      .post(`/onboarding/solicitacoes/${solicitacaoId}/aceite`)
      .send({ aceite: 'aceito' })

    expect(response.status).toBe(400)
  })

  it('aceite válido cria o lava-rápido, conclui a solicitação e libera o login', async () => {
    const response = await supertest(app)
      .post(`/onboarding/solicitacoes/${solicitacaoId}/aceite`)
      .send({ aceite: '  Eu Aceito ' })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ name: 'Lava Novo', cnpj: CNPJ_NOVO })
    expect(response.body.senha).toBeUndefined()

    const solicitacao = await supertest(app).get(`/onboarding/solicitacoes/${solicitacaoId}`)
    expect(solicitacao.body).toMatchObject({ status: 'concluida', lavaRapidoId: response.body.id })
    expect(solicitacao.body.aceitoEm).not.toBeNull()

    const lista = await supertest(app).get('/lavaRapidos')
    expect(lista.body.some((item: { id: string }) => item.id === response.body.id)).toBe(true)

    const login = await supertest(app).post('/lavaRapidos/login').send({ cnpj: CNPJ_NOVO, senha: 'admin' })
    expect(login.status).toBe(200)
  })

  it('recusa aceite repetido', async () => {
    const response = await supertest(app)
      .post(`/onboarding/solicitacoes/${solicitacaoId}/aceite`)
      .send({ aceite: 'eu aceito' })

    expect(response.status).toBe(409)
  })
})
