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

  it('retorna 404 para um id inexistente', async () => {
    const response = await supertest(app).get('/lavaRapidos/id-que-nao-existe')

    expect(response.status).toBe(404)
  })
})
