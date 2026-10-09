import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'

const app = createApp()

function cnpjAleatorio() {
  return Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('')
}

async function criarLavaRapido(name: string) {
  return prisma.lavaRapido.create({
    data: {
      name,
      cnpj: cnpjAleatorio(),
      senha: 'hash-fake-nao-usado-nestes-testes',
      distance: '1 km',
      time: '5 min',
      price: 0,
      image: 'https://placehold.co/300x300?text=Teste',
      latitude: 0,
      longitude: 0,
    },
  })
}

describe('GET /lavaRapidos/:id/horarios', () => {
  const ids: string[] = []
  let comHorarioId: string
  let semHorarioId: string

  beforeAll(async () => {
    const comHorario = await criarLavaRapido('Lava-rápido com horário (teste)')
    const semHorario = await criarLavaRapido('Lava-rápido sem horário (teste)')
    comHorarioId = comHorario.id
    semHorarioId = semHorario.id
    ids.push(comHorarioId, semHorarioId)

    await prisma.horarioFuncionamento.createMany({
      data: [
        { lavaRapidoId: comHorarioId, diaSemana: 0, fechado: true },
        ...[1, 2, 3, 4, 5].map((diaSemana) => ({ lavaRapidoId: comHorarioId, diaSemana, abertura: '08:00', fechamento: '18:00' })),
        { lavaRapidoId: comHorarioId, diaSemana: 6, abertura: '08:00', fechamento: '12:00' },
      ],
    })
  })

  afterAll(async () => {
    // HorarioFuncionamento sai junto (onDelete: Cascade).
    await prisma.lavaRapido.deleteMany({ where: { id: { in: ids } } })
    await prisma.$disconnect()
  })

  it('devolve os 7 dias, na ordem 0 a 6', async () => {
    const response = await supertest(app).get(`/lavaRapidos/${comHorarioId}/horarios`)

    expect(response.status).toBe(200)
    expect(response.body.map((dia: { diaSemana: number }) => dia.diaSemana)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(response.body[0]).toEqual({ diaSemana: 0, fechado: true, abertura: null, fechamento: null, definido: true })
    expect(response.body[1]).toEqual({ diaSemana: 1, fechado: false, abertura: '08:00', fechamento: '18:00', definido: true })
    expect(response.body[6]).toEqual({ diaSemana: 6, fechado: false, abertura: '08:00', fechamento: '12:00', definido: true })
  })

  it('lava-rápido sem horário cadastrado: 7 dias com definido false', async () => {
    const response = await supertest(app).get(`/lavaRapidos/${semHorarioId}/horarios`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(7)
    expect(response.body[3]).toEqual({ diaSemana: 3, fechado: false, abertura: null, fechamento: null, definido: false })
  })

  it('404 para lava-rápido inexistente', async () => {
    const response = await supertest(app).get('/lavaRapidos/id-que-nao-existe/horarios')
    expect(response.status).toBe(404)
  })

  it('GET /lavaRapidos/:id já inclui os horarios (7 dias)', async () => {
    const response = await supertest(app).get(`/lavaRapidos/${comHorarioId}`)

    expect(response.status).toBe(200)
    expect(response.body.horarios).toHaveLength(7)
    expect(response.body.horarios[1]).toMatchObject({ abertura: '08:00', fechamento: '18:00' })
  })
})
