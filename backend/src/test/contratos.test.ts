import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'

const app = createApp()

// Versão alta e exclusiva deste arquivo pra não colidir com o seed nem com
// onboarding.test.ts, que roda em paralelo no mesmo banco.
const VERSAO_TESTE = 9001

describe('GET /contratos/vigente', () => {
  beforeAll(async () => {
    await prisma.contrato.create({
      data: { versao: VERSAO_TESTE, titulo: 'Contrato de teste', conteudo: 'Termos de teste', vigente: true },
    })
  })

  afterAll(async () => {
    await prisma.contrato.deleteMany({ where: { versao: VERSAO_TESTE } })
    await prisma.$disconnect()
  })

  it('devolve um contrato vigente', async () => {
    const response = await supertest(app).get('/contratos/vigente')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ vigente: true })
    expect(typeof response.body.conteudo).toBe('string')
    expect(response.body.versao).toBeGreaterThanOrEqual(VERSAO_TESTE)
  })
})
