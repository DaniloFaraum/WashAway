import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { comToken } from './helpers/auth.js'
import { criarLavaRapidoTeste, sufixoUnico } from './helpers/factories.js'
import { limparDadosDeTeste } from './helpers/limpeza.js'

const app = createApp()

const VERSAO_TESTE = 9101
const CNPJ_NOVO = '22222222000122'
const CNPJ_LEGADO = '22222222000144'
const CNPJ_JA_CADASTRADO = '22222222000133'
const CNPJS = [CNPJ_NOVO, CNPJ_LEGADO, CNPJ_JA_CADASTRADO]
const EMAIL_NOVO = `lava-novo-${sufixoUnico()}@teste.washaway.dev`
const SENHA_NOVA = 'minha-senha-123'

describe('/onboarding/solicitacoes', () => {
  let solicitacaoId: string
  let emailJaCadastrado: string

  beforeAll(async () => {
    const contrato = await prisma.contrato.create({
      data: { versao: VERSAO_TESTE, titulo: 'Contrato de teste', conteudo: 'Termos de teste', vigente: true },
    })
    emailJaCadastrado = `ja-cadastrado-${sufixoUnico()}@teste.washaway.dev`
    await criarLavaRapidoTeste({ name: 'Já cadastrado', cnpj: CNPJ_JA_CADASTRADO, email: emailJaCadastrado })
    // Solicitação anterior ao I17: sem e-mail e senha.
    await prisma.solicitacaoOnboarding.create({ data: { name: 'Legado', cnpj: CNPJ_LEGADO, contratoId: contrato.id } })
  })

  afterAll(async () => {
    await prisma.solicitacaoOnboarding.deleteMany({ where: { cnpj: { in: CNPJS } } })
    await prisma.lavaRapido.deleteMany({ where: { cnpj: { in: CNPJS } } })
    await limparDadosDeTeste()
    await prisma.contrato.deleteMany({ where: { versao: VERSAO_TESTE } })
    await prisma.$disconnect()
  })

  function solicitar(body: Record<string, unknown>) {
    return supertest(app).post('/onboarding/solicitacoes').send(body)
  }

  it('recusa cnpj com formato inválido', async () => {
    const response = await solicitar({ name: 'X', cnpj: '123', email: EMAIL_NOVO, senha: SENHA_NOVA })

    expect(response.status).toBe(400)
  })

  it.each([
    ['sem e-mail', { senha: SENHA_NOVA }],
    ['e-mail inválido', { email: 'nao-e-email', senha: SENHA_NOVA }],
    ['sem senha', { email: 'x@exemplo.com' }],
    ['senha com menos de 8 caracteres', { email: 'x@exemplo.com', senha: '1234567' }],
  ])('recusa %s (400)', async (_caso, extra) => {
    const response = await solicitar({ name: 'Lava Novo', cnpj: CNPJ_NOVO, ...extra })

    expect(response.status).toBe(400)
    expect(response.body.error).toEqual(expect.any(String))
  })

  it('recusa cnpj que já é um lava-rápido', async () => {
    const response = await solicitar({ name: 'Outro', cnpj: CNPJ_JA_CADASTRADO, email: EMAIL_NOVO, senha: SENHA_NOVA })

    expect(response.status).toBe(409)
  })

  it('recusa e-mail que já é de um lava-rápido (sem diferenciar maiúsculas)', async () => {
    const response = await solicitar({ name: 'Outro', cnpj: CNPJ_NOVO, email: `  ${emailJaCadastrado.toUpperCase()} `, senha: SENHA_NOVA })

    expect(response.status).toBe(409)
    expect(response.body.error).toMatch(/e-mail/)
  })

  it('cria a solicitação já aguardando contrato, com o contrato vigente e sem expor a senha', async () => {
    const response = await solicitar({ name: 'Lava Novo', address: 'Rua A, 1', cnpj: CNPJ_NOVO, email: EMAIL_NOVO.toUpperCase(), senha: SENHA_NOVA })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ name: 'Lava Novo', cnpj: CNPJ_NOVO, email: EMAIL_NOVO, status: 'aguardando_contrato' })
    expect(response.body.contrato).toMatchObject({ titulo: expect.any(String), conteudo: expect.any(String) })
    expect(response.body).not.toHaveProperty('senhaHash')
    expect(response.body).not.toHaveProperty('senha')
    solicitacaoId = response.body.id

    const noBanco = await prisma.solicitacaoOnboarding.findUnique({ where: { id: solicitacaoId } })
    expect(noBanco?.senhaHash).toMatch(/^\$2[aby]\$/)
    expect(noBanco?.senhaHash).not.toContain(SENHA_NOVA)
  })

  it('devolve a mesma solicitação pendente em vez de duplicar', async () => {
    const response = await solicitar({ name: 'Lava Novo', cnpj: CNPJ_NOVO, email: EMAIL_NOVO, senha: SENHA_NOVA })

    expect(response.status).toBe(200)
    expect(response.body.id).toBe(solicitacaoId)
  })

  it('antes do aceite a empresa não aparece em GET /lavaRapidos nem consegue logar', async () => {
    const lista = await supertest(app).get('/lavaRapidos')
    expect(lista.body.some((item: { cnpj: string }) => item.cnpj === CNPJ_NOVO)).toBe(false)

    const login = await supertest(app).post('/lavaRapidos/login').send({ cnpj: CNPJ_NOVO, senha: SENHA_NOVA })
    expect(login.status).toBe(401)
  })

  it('mostra status e contrato da solicitação, sem o hash da senha', async () => {
    const response = await supertest(app).get(`/onboarding/solicitacoes/${solicitacaoId}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: solicitacaoId, status: 'aguardando_contrato' })
    expect(response.body.contrato).toBeDefined()
    expect(response.body).not.toHaveProperty('senhaHash')
  })

  it('404 para solicitação inexistente', async () => {
    const response = await supertest(app).get('/onboarding/solicitacoes/nao-existe')

    expect(response.status).toBe(404)
  })

  it('recusa aceite com texto diferente de "eu aceito"', async () => {
    const response = await supertest(app).post(`/onboarding/solicitacoes/${solicitacaoId}/aceite`).send({ aceite: 'aceito' })

    expect(response.status).toBe(400)
  })

  it('aceite válido cria o lava-rápido com o e-mail e devolve a sessão { token, lavaRapido }', async () => {
    const response = await supertest(app).post(`/onboarding/solicitacoes/${solicitacaoId}/aceite`).send({ aceite: '  Eu Aceito ' })

    expect(response.status).toBe(201)
    expect(response.body.lavaRapido).toMatchObject({ name: 'Lava Novo', cnpj: CNPJ_NOVO, email: EMAIL_NOVO })
    expect(response.body.lavaRapido.horarios).toEqual(expect.any(Array))
    expect(response.body.lavaRapido.senha).toBeUndefined()
    expect(jwt.decode(response.body.token)).toMatchObject({ sub: response.body.lavaRapido.id, tipo: 'lavaRapido' })

    const solicitacao = await supertest(app).get(`/onboarding/solicitacoes/${solicitacaoId}`)
    expect(solicitacao.body).toMatchObject({ status: 'concluida', lavaRapidoId: response.body.lavaRapido.id })
    expect(solicitacao.body.aceitoEm).not.toBeNull()

    const pedidos = await comToken(supertest(app).get('/pedidos'), response.body.token)
    expect(pedidos.status).toBe(200)
  })

  it('a empresa criada no aceite entra com a senha escolhida e NÃO com "admin"', async () => {
    const comSenhaEscolhida = await supertest(app).post('/lavaRapidos/login').send({ cnpj: CNPJ_NOVO, senha: SENHA_NOVA })
    const comAdmin = await supertest(app).post('/lavaRapidos/login').send({ cnpj: CNPJ_NOVO, senha: 'admin' })

    expect(comSenhaEscolhida.status).toBe(200)
    expect(comAdmin.status).toBe(401)
  })

  it('recusa aceite repetido', async () => {
    const response = await supertest(app).post(`/onboarding/solicitacoes/${solicitacaoId}/aceite`).send({ aceite: 'eu aceito' })

    expect(response.status).toBe(409)
  })

  describe('solicitação anterior ao I17 (sem e-mail e senha)', () => {
    it('aceite recusa (409) em vez de criar empresa com senha fixa', async () => {
      const legado = await prisma.solicitacaoOnboarding.findFirstOrThrow({ where: { cnpj: CNPJ_LEGADO } })

      const response = await supertest(app).post(`/onboarding/solicitacoes/${legado.id}/aceite`).send({ aceite: 'eu aceito' })

      expect(response.status).toBe(409)
      expect(response.body.error).toMatch(/e-mail e senha/)
      expect(await prisma.lavaRapido.findUnique({ where: { cnpj: CNPJ_LEGADO } })).toBeNull()
    })

    it('reenviar o cadastro completa a mesma solicitação, e aí o aceite funciona', async () => {
      const legado = await prisma.solicitacaoOnboarding.findFirstOrThrow({ where: { cnpj: CNPJ_LEGADO } })
      const email = `legado-${sufixoUnico()}@teste.washaway.dev`

      const reenvio = await solicitar({ name: 'Legado', cnpj: CNPJ_LEGADO, email, senha: SENHA_NOVA })
      expect(reenvio.status).toBe(200)
      expect(reenvio.body.id).toBe(legado.id)

      const aceite = await supertest(app).post(`/onboarding/solicitacoes/${legado.id}/aceite`).send({ aceite: 'eu aceito' })
      expect(aceite.status).toBe(201)
      expect(aceite.body.lavaRapido).toMatchObject({ cnpj: CNPJ_LEGADO, email })
    })
  })
})
