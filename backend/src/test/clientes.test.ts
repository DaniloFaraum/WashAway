import { afterAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { criarClienteTeste, sufixoUnico } from './helpers/factories.js'
import { limparDadosDeTeste, registrarParaLimpeza } from './helpers/limpeza.js'

const app = createApp()

afterAll(async () => {
  await limparDadosDeTeste()
  await prisma.$disconnect()
})

function emailUnico() {
  return `cadastro-${sufixoUnico()}@teste.washaway.dev`
}

async function cadastrar(body: Record<string, unknown>) {
  const response = await supertest(app).post('/auth/cliente/cadastro').send(body)
  if (response.status === 201) registrarParaLimpeza('cliente', response.body.id)
  return response
}

describe('Testes automatizados: cadastro ok, e-mail duplicado, e-mail inválido, senha curta', () => {
  it('cadastro ok: 201, sem senha na resposta e hash gravado diferente da senha', async () => {
    const email = emailUnico()
    const response = await cadastrar({ nome: '  Ana Teste  ', email, senha: 'segredo123' })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ nome: 'Ana Teste', email })
    expect(response.body.id).toEqual(expect.any(String))
    expect(response.body).not.toHaveProperty('senha')

    const gravado = await prisma.cliente.findUniqueOrThrow({ where: { id: response.body.id } })
    expect(gravado.senha).not.toBe('segredo123')
    expect(gravado.senha).toMatch(/^\$2[aby]\$/)
  })

  it('e-mail duplicado: 409 com mensagem clara', async () => {
    const existente = await criarClienteTeste()

    const response = await cadastrar({ nome: 'Outra', email: existente.email, senha: 'segredo123' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'Este e-mail já está cadastrado' })
  })

  it('e-mail duplicado com caixa diferente também dá 409 (e-mail salvo normalizado)', async () => {
    const sufixo = sufixoUnico()
    const primeiro = await cadastrar({ nome: 'Ana', email: `Ana-${sufixo}@X.com`, senha: 'segredo123' })
    expect(primeiro.status).toBe(201)
    expect(primeiro.body.email).toBe(`ana-${sufixo}@x.com`)

    const segundo = await cadastrar({ nome: 'Ana 2', email: ` ana-${sufixo}@x.COM `, senha: 'segredo123' })

    expect(segundo.status).toBe(409)
  })

  it('e-mail inválido: 400 com o erro no campo email', async () => {
    const response = await cadastrar({ nome: 'Ana', email: 'ana-sem-arroba.com', senha: 'segredo123' })

    expect(response.status).toBe(400)
    expect(response.body.campos).toEqual({ email: 'E-mail inválido' })
  })

  it('senha curta: 400 com o erro no campo senha', async () => {
    const response = await cadastrar({ nome: 'Ana', email: emailUnico(), senha: '12345' })

    expect(response.status).toBe(400)
    expect(Object.keys(response.body.campos)).toEqual(['senha'])
  })
})

describe('POST /auth/cliente/cadastro — outros casos', () => {
  it('body vazio: 400 com erro em nome, email e senha', async () => {
    const response = await cadastrar({})

    expect(response.status).toBe(400)
    expect(Object.keys(response.body.campos).sort()).toEqual(['email', 'nome', 'senha'])
  })

  it('JSON malformado: 400, sem 500', async () => {
    const response = await supertest(app)
      .post('/auth/cliente/cadastro')
      .set('Content-Type', 'application/json')
      .send('{"senha": "segredo123",')

    expect(response.status).toBe(400)
    expect(JSON.stringify(response.body)).not.toContain('segredo123')
  })
})
