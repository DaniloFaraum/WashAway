import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { comToken, tokenDeCliente, tokenDeLavaRapido } from './helpers/auth.js'

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

describe('PUT /lavaRapidos/:id/horarios', () => {
  const ids: string[] = []
  let empresaId: string
  let outraEmpresaId: string
  let token: string

  // Seg–sex 09:00–17:00, sáb e dom fechados.
  const novaSemana = [
    { diaSemana: 0, fechado: true },
    ...[1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, fechado: false, abertura: '09:00', fechamento: '17:00' })),
    { diaSemana: 6, fechado: true },
  ]

  beforeAll(async () => {
    const empresa = await criarLavaRapido('Lava-rápido que edita o horário (teste)')
    const outra = await criarLavaRapido('Outro lava-rápido (teste)')
    empresaId = empresa.id
    outraEmpresaId = outra.id
    ids.push(empresaId, outraEmpresaId)
    token = tokenDeLavaRapido(empresa)

    await prisma.horarioFuncionamento.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({ lavaRapidoId: outraEmpresaId, diaSemana, abertura: '08:00', fechamento: '18:00' })),
    })
  })

  afterAll(async () => {
    await prisma.lavaRapido.deleteMany({ where: { id: { in: ids } } })
    await prisma.$disconnect()
  })

  it('substitui os 7 dias e o GET e o detalhe passam a refletir', async () => {
    const response = await comToken(supertest(app).put(`/lavaRapidos/${empresaId}/horarios`), token).send({ dias: novaSemana })

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(7)
    expect(response.body[0]).toEqual({ diaSemana: 0, fechado: true, abertura: null, fechamento: null, definido: true })
    expect(response.body[1]).toEqual({ diaSemana: 1, fechado: false, abertura: '09:00', fechamento: '17:00', definido: true })

    // Substitui de novo (não duplica nem conflita com o @@unique).
    const segunda = await comToken(supertest(app).put(`/lavaRapidos/${empresaId}/horarios`), token).send({
      dias: novaSemana.map((dia) => (dia.diaSemana === 6 ? { diaSemana: 6, fechado: false, abertura: '08:00', fechamento: '12:00' } : dia)),
    })
    expect(segunda.status).toBe(200)
    expect(await prisma.horarioFuncionamento.count({ where: { lavaRapidoId: empresaId } })).toBe(7)

    const get = await supertest(app).get(`/lavaRapidos/${empresaId}/horarios`)
    expect(get.body[6]).toEqual({ diaSemana: 6, fechado: false, abertura: '08:00', fechamento: '12:00', definido: true })
    const detalhe = await supertest(app).get(`/lavaRapidos/${empresaId}`)
    expect(detalhe.body.horarios[1]).toMatchObject({ abertura: '09:00', fechamento: '17:00' })
  })

  it('401 sem token', async () => {
    const response = await supertest(app).put(`/lavaRapidos/${empresaId}/horarios`).send({ dias: novaSemana })
    expect(response.status).toBe(401)
  })

  it('403 com token de cliente', async () => {
    const response = await comToken(supertest(app).put(`/lavaRapidos/${empresaId}/horarios`), tokenDeCliente({ id: 'cliente-qualquer' }))
      .send({ dias: novaSemana })
    expect(response.status).toBe(403)
  })

  it('404 ao tentar editar o horário de outra empresa, sem alterar nada', async () => {
    const response = await comToken(supertest(app).put(`/lavaRapidos/${outraEmpresaId}/horarios`), token).send({ dias: novaSemana })

    expect(response.status).toBe(404)
    expect(response.body.error).toBe('Lava-rápido não encontrado')
    const registros = await prisma.horarioFuncionamento.findMany({ where: { lavaRapidoId: outraEmpresaId } })
    expect(registros).toHaveLength(7)
    expect(registros.every((dia) => dia.abertura === '08:00' && dia.fechamento === '18:00')).toBe(true)
  })

  it('401 com token de uma empresa que não existe mais', async () => {
    const response = await comToken(supertest(app).put('/lavaRapidos/empresa-apagada/horarios'), tokenDeLavaRapido({ id: 'empresa-apagada' }))
      .send({ dias: novaSemana })
    expect(response.status).toBe(401)
  })

  it.each([
    ['abertura depois do fechamento', novaSemana.map((dia) => (dia.diaSemana === 1 ? { ...dia, abertura: '18:00', fechamento: '08:00' } : dia)), 'Abertura de segunda deve ser antes do fechamento'],
    ['formato inválido', novaSemana.map((dia) => (dia.diaSemana === 2 ? { ...dia, abertura: '9h' } : dia)), 'Horário de terça deve estar no formato HH:mm (00:00 a 23:59)'],
    ['dia repetido', [...novaSemana.slice(0, 6), { diaSemana: 5, fechado: true }], 'O dia sexta foi informado mais de uma vez'],
    ['dia faltando', novaSemana.slice(0, 6), 'Informe os 7 dias da semana (faltando: sábado)'],
  ])('400 com mensagem clara: %s', async (_caso, dias, mensagem) => {
    const antes = await prisma.horarioFuncionamento.findMany({ where: { lavaRapidoId: empresaId }, orderBy: { diaSemana: 'asc' } })

    const response = await comToken(supertest(app).put(`/lavaRapidos/${empresaId}/horarios`), token).send({ dias })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe(mensagem)
    const depois = await prisma.horarioFuncionamento.findMany({ where: { lavaRapidoId: empresaId }, orderBy: { diaSemana: 'asc' } })
    expect(depois).toEqual(antes)
  })
})
