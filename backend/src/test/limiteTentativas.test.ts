import { afterAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { criarClienteTeste, criarLavaRapidoTeste, SENHA_CLIENTE_TESTE, sufixoUnico } from './helpers/factories.js'
import { limparDadosDeTeste, registrarParaLimpeza } from './helpers/limpeza.js'

// Limite de tentativas (I17, decisão de 2026-10-10): login do cliente, login do
// lava-rápido e cadastro do cliente. App com limite baixo só neste arquivo — os
// outros testes usam LIMITE_TENTATIVAS alto (vitest.config.ts).

const LIMITE = 3
const novoApp = () => createApp({ limiteTentativas: { limite: LIMITE, janelaMinutos: 15 } })


afterAll(async () => {
  await limparDadosDeTeste()
  await prisma.$disconnect()
})

describe('POST /lavaRapidos/login', () => {
  it(`depois de ${LIMITE} senhas erradas, responde 429 com mensagem amigável — até com a senha certa`, async () => {
    const app = novoApp()
    const lavaRapido = await criarLavaRapidoTeste({ senha: 'senha-certa-123' })
    const tentar = (senha: string) => supertest(app).post('/lavaRapidos/login').send({ cnpj: lavaRapido.cnpj, senha })

    for (let i = 0; i < LIMITE; i++) {
      expect((await tentar('errada')).status).toBe(401)
    }
    const bloqueada = await tentar('senha-certa-123')

    expect(bloqueada.status).toBe(429)
    expect(bloqueada.body.error).toMatch(/Muitas tentativas/)
    expect(bloqueada.headers['retry-after']).toBeDefined()
  })

  it('a chave inclui o CNPJ: estourar o limite de um CNPJ não bloqueia o login de outro', async () => {
    const app = novoApp()
    const bloqueado = await criarLavaRapidoTeste({ senha: 'senha-certa-123' })
    const livre = await criarLavaRapidoTeste({ senha: 'senha-certa-123' })

    for (let i = 0; i <= LIMITE; i++) {
      await supertest(app).post('/lavaRapidos/login').send({ cnpj: bloqueado.cnpj, senha: 'errada' })
    }
    const outro = await supertest(app).post('/lavaRapidos/login').send({ cnpj: livre.cnpj, senha: 'senha-certa-123' })

    expect(outro.status).toBe(200)
  })

  it('logins certos não gastam tentativas', async () => {
    const app = novoApp()
    const lavaRapido = await criarLavaRapidoTeste({ senha: 'senha-certa-123' })

    for (let i = 0; i < LIMITE + 2; i++) {
      const response = await supertest(app).post('/lavaRapidos/login').send({ cnpj: lavaRapido.cnpj, senha: 'senha-certa-123' })
      expect(response.status).toBe(200)
    }
  })
})

describe('POST /auth/cliente/login', () => {
  it(`depois de ${LIMITE} senhas erradas, responde 429 (e-mail normalizado na chave)`, async () => {
    const app = novoApp()
    const cliente = await criarClienteTeste()
    const tentar = (email: string, senha: string) => supertest(app).post('/auth/cliente/login').send({ email, senha })

    for (let i = 0; i < LIMITE; i++) {
      // Variações de maiúsculas/espaços contam como o mesmo e-mail.
      expect((await tentar(i % 2 ? ` ${cliente.email.toUpperCase()} ` : cliente.email, 'errada')).status).toBe(401)
    }
    const bloqueada = await tentar(cliente.email, SENHA_CLIENTE_TESTE)

    expect(bloqueada.status).toBe(429)
    expect(bloqueada.body).toEqual({ error: expect.stringMatching(/Muitas tentativas/) })
  })
})

describe('POST /auth/cliente/cadastro', () => {
  it(`a partir da ${LIMITE + 1}ª tentativa com o mesmo e-mail, responde 429`, async () => {
    const app = novoApp()
    const email = `limite-${sufixoUnico()}@teste.washaway.dev`
    const cadastrar = () => supertest(app).post('/auth/cliente/cadastro').send({ nome: 'Limite', email, senha: 'senha-123' })

    const primeiro = await cadastrar()
    expect(primeiro.status).toBe(201)
    registrarParaLimpeza('cliente', primeiro.body.id)
    for (let i = 1; i < LIMITE; i++) {
      expect((await cadastrar()).status).toBe(409)
    }
    const bloqueado = await cadastrar()

    expect(bloqueado.status).toBe(429)
    expect(bloqueado.body.error).toMatch(/Muitas tentativas/)
  })
})
