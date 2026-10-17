import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import express from 'express'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { verificarToken } from '../auth/token.js'
import { prisma } from '../config/prisma.js'
import { autenticar } from '../middlewares/autenticar.js'
import { autorizar } from '../middlewares/autorizar.js'
import { criarUsuarioInterno } from '../modules/internos/internos.service.js'
import { comToken, tokenDeCliente, tokenDeInterno, tokenDeLavaRapido } from './helpers/auth.js'
import { criarUsuarioInternoTeste, SENHA_INTERNO_TESTE, sufixoUnico } from './helpers/factories.js'
import { limparDadosDeTeste, registrarParaLimpeza } from './helpers/limpeza.js'

// i17-interno-exclusao: login do usuário interno (equipe WashAway) e o
// middleware de permissão `autorizar`, separado da autenticação.

const app = createApp()

let interno: Awaited<ReturnType<typeof criarUsuarioInternoTeste>>

beforeAll(async () => {
  interno = await criarUsuarioInternoTeste({ permissoes: ['admin'] })
})

afterAll(async () => {
  await limparDadosDeTeste()
  await prisma.$disconnect()
})

describe('POST /auth/interno/login', () => {
  it('credenciais certas: token tipo interno com as permissões, sem a senha', async () => {
    const response = await supertest(app)
      .post('/auth/interno/login')
      .send({ email: `  ${interno.email.toUpperCase()} `, senha: SENHA_INTERNO_TESTE })

    expect(response.status).toBe(200)
    expect(response.body.interno).toMatchObject({ id: interno.id, email: interno.email, permissoes: ['admin'] })
    expect(response.body.interno).not.toHaveProperty('senha')
    expect(verificarToken(response.body.token)).toEqual({ id: interno.id, tipo: 'interno', permissoes: ['admin'] })
    expect(typeof response.body.expiraEm).toBe('string')
  })

  it('senha errada, e-mail inexistente ou body incompleto: 401 com a mesma mensagem', async () => {
    const senhaErrada = await supertest(app).post('/auth/interno/login').send({ email: interno.email, senha: 'errada' })
    const inexistente = await supertest(app)
      .post('/auth/interno/login')
      .send({ email: `ninguem-${sufixoUnico()}@teste.washaway.dev`, senha: SENHA_INTERNO_TESTE })
    const incompleto = await supertest(app).post('/auth/interno/login').send({ email: interno.email })

    for (const response of [senhaErrada, inexistente, incompleto]) {
      expect(response.status).toBe(401)
      expect(response.body).toEqual({ error: 'E-mail ou senha incorretos' })
    }
  })

  it('não existe rota pública de cadastro de interno', async () => {
    const response = await supertest(app)
      .post('/auth/interno/cadastro')
      .send({ nome: 'X', email: `x-${sufixoUnico()}@teste.washaway.dev`, senha: 'qualquer123', permissoes: ['admin'] })

    expect(response.status).toBe(404)
  })
})

describe('criarUsuarioInterno (script/seed/demo)', () => {
  it('grava e-mail normalizado e só o hash da senha', async () => {
    const email = `Script-${sufixoUnico()}@Teste.WashAway.dev`
    const criado = await criarUsuarioInterno({ nome: 'Pelo script', email, senha: 'senha-do-script', permissoes: ['admin'] })
    registrarParaLimpeza('usuarioInterno', criado.id)

    expect(criado.email).toBe(email.toLowerCase())
    expect(criado.senha).not.toBe('senha-do-script')
    const login = await supertest(app).post('/auth/interno/login').send({ email, senha: 'senha-do-script' })
    expect(login.status).toBe(200)
  })
})

describe('autorizar(...permissoes)', () => {
  const appMinimo = express()
  appMinimo.get('/admin', autenticar('interno'), autorizar('admin'), (_req, res) => {
    res.json({ ok: true })
  })
  appMinimo.get('/duas', autenticar('interno'), autorizar('admin', 'outra'), (_req, res) => {
    res.json({ ok: true })
  })
  appMinimo.get('/sem-autenticar', autorizar('admin'), (_req, res) => {
    res.json({ ok: true })
  })

  it('sem token: 401 (autenticação), antes de olhar a permissão', async () => {
    const response = await supertest(appMinimo).get('/admin')

    expect(response.status).toBe(401)
  })

  it('token de lava-rápido ou de cliente: 403', async () => {
    const lavaRapido = await comToken(supertest(appMinimo).get('/admin'), tokenDeLavaRapido({ id: 'lr-1' }))
    const cliente = await comToken(supertest(appMinimo).get('/admin'), tokenDeCliente({ id: 'c-1' }))

    expect(lavaRapido.status).toBe(403)
    expect(cliente.status).toBe(403)
  })

  it('interno sem a permissão: 403; com a permissão: passa', async () => {
    const semPermissao = await comToken(supertest(appMinimo).get('/admin'), tokenDeInterno([]))
    const outraPermissao = await comToken(supertest(appMinimo).get('/admin'), tokenDeInterno(['suporte']))
    const comAdmin = await comToken(supertest(appMinimo).get('/admin'), tokenDeInterno(['admin']))

    expect(semPermissao.status).toBe(403)
    expect(semPermissao.body).toEqual({ error: 'Permissão insuficiente para esta ação' })
    expect(outraPermissao.status).toBe(403)
    expect(comAdmin.status).toBe(200)
  })

  it('com várias permissões, exige todas', async () => {
    const soUma = await comToken(supertest(appMinimo).get('/duas'), tokenDeInterno(['admin']))
    const todas = await comToken(supertest(appMinimo).get('/duas'), tokenDeInterno(['admin', 'outra']))

    expect(soUma.status).toBe(403)
    expect(todas.status).toBe(200)
  })

  it('montado sem autenticar antes: 401', async () => {
    const response = await comToken(supertest(appMinimo).get('/sem-autenticar'), tokenDeInterno(['admin']))

    expect(response.status).toBe(401)
  })

  it('exige ao menos uma permissão na montagem', () => {
    expect(() => autorizar()).toThrow()
  })
})
