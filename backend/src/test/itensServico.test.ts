import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'

const app = createApp()

describe('/itensServico', () => {
  const ids: string[] = []

  beforeAll(async () => {
    for (const data of [
      { nome: 'ZZ teste B', descricao: 'teste', categoria: 'ZZ categoria teste', duracaoMinutos: 10 },
      { nome: 'ZZ teste A', descricao: 'teste', categoria: 'ZZ categoria teste', duracaoMinutos: 10 },
      { nome: 'ZZ teste inativo', descricao: 'teste', categoria: 'ZZ categoria teste', duracaoMinutos: 10, ativo: false },
    ]) {
      ids.push((await prisma.itemServico.create({ data })).id)
    }
  })

  afterAll(async () => {
    await prisma.itemServico.deleteMany({ where: { id: { in: ids } } })
    await prisma.$disconnect()
  })

  it('GET /itensServico lista só os itens ativos, ordenados por nome dentro da categoria', async () => {
    const response = await supertest(app).get('/itensServico')

    expect(response.status).toBe(200)
    const nomesDoTeste = response.body
      .filter((item: { categoria: string }) => item.categoria === 'ZZ categoria teste')
      .map((item: { nome: string }) => item.nome)
    expect(nomesDoTeste).toEqual(['ZZ teste A', 'ZZ teste B'])
  })

  it('GET /itensServico inclui a duração estimada de cada item', async () => {
    const response = await supertest(app).get('/itensServico')

    const item = response.body.find((entry: { nome: string }) => entry.nome === 'ZZ teste A')
    expect(item.duracaoMinutos).toBe(10)
  })

  it('não existe rota para a loja criar item no catálogo', async () => {
    const response = await supertest(app).post('/itensServico').send({ nome: 'Massagem', descricao: 'x', categoria: 'x' })

    expect(response.status).toBe(404)
  })
})
