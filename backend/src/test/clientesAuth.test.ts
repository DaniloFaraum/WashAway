import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { assinarToken } from '../auth/token.js'
import { prisma } from '../config/prisma.js'
import { tokenDeCliente, comToken } from './helpers/auth.js'
import { criarClienteTeste, sufixoUnico, SENHA_CLIENTE_TESTE } from './helpers/factories.js'
import { limparDadosDeTeste } from './helpers/limpeza.js'

const app = createApp()

type ClienteTeste = Awaited<ReturnType<typeof criarClienteTeste>>
let cliente: ClienteTeste

beforeAll(async () => {
  cliente = await criarClienteTeste()
})

afterAll(async () => {
  await limparDadosDeTeste()
  await prisma.$disconnect()
})

function login(body: Record<string, unknown>) {
  return supertest(app).post('/auth/cliente/login').send(body)
}

describe('Testes automatizados: login ok, login inválido, acesso sem token, token expirado', () => {
  it('login ok: 200 com token, validade e cliente sem a senha', async () => {
    const response = await login({ email: cliente.email, senha: SENHA_CLIENTE_TESTE })

    expect(response.status).toBe(200)
    expect(response.body.token).toEqual(expect.any(String))
    expect(response.body.cliente).toMatchObject({ id: cliente.id, nome: cliente.nome, email: cliente.email })
    expect(response.body.cliente).not.toHaveProperty('senha')

    const seteDias = 7 * 24 * 60 * 60 * 1000
    const expiraEm = new Date(response.body.expiraEm).getTime()
    expect(Math.abs(expiraEm - (Date.now() + seteDias))).toBeLessThan(60_000)

    const payload = jwt.decode(response.body.token) as jwt.JwtPayload
    expect(payload).toMatchObject({ sub: cliente.id, tipo: 'cliente' })
  })

  it('login inválido: e-mail inexistente e senha errada dão o mesmo 401 e a mesma mensagem', async () => {
    const emailInexistente = await login({ email: `ninguem-${sufixoUnico()}@teste.washaway.dev`, senha: SENHA_CLIENTE_TESTE })
    const senhaErrada = await login({ email: cliente.email, senha: 'senha-errada' })

    expect(emailInexistente.status).toBe(401)
    expect(senhaErrada.status).toBe(401)
    expect(emailInexistente.body).toEqual({ error: 'E-mail ou senha incorretos' })
    expect(senhaErrada.body).toEqual(emailInexistente.body)
  })

  it('acesso sem token: GET /clientes/me dá 401', async () => {
    const response = await supertest(app).get('/clientes/me')

    expect(response.status).toBe(401)
    expect(response.body.error).toEqual(expect.any(String))
  })

  it('token expirado: GET /clientes/me dá 401', async () => {
    const expirado = jwt.sign({ tipo: 'cliente' }, process.env.JWT_SECRET!, { subject: cliente.id, expiresIn: -10 })

    const response = await comToken(supertest(app).get('/clientes/me'), expirado)

    expect(response.status).toBe(401)
  })
})

describe('Login e GET /clientes/me — outros casos', () => {
  it('login aceita o e-mail com caixa e espaços diferentes', async () => {
    const response = await login({ email: `  ${cliente.email.toUpperCase()} `, senha: SENHA_CLIENTE_TESTE })

    expect(response.status).toBe(200)
    expect(response.body.cliente.id).toBe(cliente.id)
  })

  it('login sem body: 401 com a mensagem genérica', async () => {
    const response = await login({})

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'E-mail ou senha incorretos' })
  })

  it('token inválido (lixo): 401', async () => {
    const response = await comToken(supertest(app).get('/clientes/me'), 'nao-e-um-jwt')

    expect(response.status).toBe(401)
  })

  it('token assinado com outro segredo: 401', async () => {
    const forjado = jwt.sign({ tipo: 'cliente' }, 'outro-segredo', { subject: cliente.id, expiresIn: '1h' })

    const response = await comToken(supertest(app).get('/clientes/me'), forjado)

    expect(response.status).toBe(401)
  })

  it('token válido: 200 com o cliente do token, sem a senha', async () => {
    const response = await comToken(supertest(app).get('/clientes/me'), tokenDeCliente(cliente))

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: cliente.id, nome: cliente.nome, email: cliente.email })
    expect(response.body).not.toHaveProperty('senha')
  })

  it('token do login funciona em GET /clientes/me', async () => {
    const { body } = await login({ email: cliente.email, senha: SENHA_CLIENTE_TESTE })

    const response = await comToken(supertest(app).get('/clientes/me'), body.token)

    expect(response.status).toBe(200)
    expect(response.body.id).toBe(cliente.id)
  })

  it('token válido de cliente que não existe mais: 401', async () => {
    const token = assinarToken({ id: `cliente-inexistente-${sufixoUnico()}`, tipo: 'cliente' })

    const response = await comToken(supertest(app).get('/clientes/me'), token)

    expect(response.status).toBe(401)
  })

  it('token de lava-rápido em rota de cliente: 403', async () => {
    const token = assinarToken({ id: 'qualquer', tipo: 'lavaRapido' })

    const response = await comToken(supertest(app).get('/clientes/me'), token)

    expect(response.status).toBe(403)
  })
})
