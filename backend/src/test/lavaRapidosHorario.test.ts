import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { criarLavaRapidoTeste } from './helpers/factories.js'
import { limparDadosDeTeste } from './helpers/limpeza.js'

// I9: GET /lavaRapidos?horario=<ISO> devolve só os lava-rápidos abertos no instante.
// Relógio fixo (só o Date) numa segunda; horas em -03:00 (São Paulo).
// 2026-11-02 é segunda; 2026-11-03 terça; 2026-11-08 domingo.
const AGORA = new Date('2026-11-02T09:00:00-03:00')
const TERCA_10H = '2026-11-03T10:00:00-03:00'
const TERCA_19H = '2026-11-03T19:00:00-03:00'
const DOMINGO_10H = '2026-11-08T10:00:00-03:00'

const app = createApp()

function idsDa(body: Array<{ id: string }>) {
  return body.map((lavaRapido) => lavaRapido.id)
}

describe('GET /lavaRapidos?horario= (busca por horário, I9)', () => {
  let comHorarioId: string
  let semHorarioId: string
  let desligadoId: string

  beforeAll(async () => {
    comHorarioId = (await criarLavaRapidoTeste({ name: 'Busca por horário — com horário' })).id
    semHorarioId = (await criarLavaRapidoTeste({ name: 'Busca por horário — sem horário' })).id
    desligadoId = (await criarLavaRapidoTeste({ name: 'Busca por horário — desligado', isOpen: false })).id

    // seg–sex 08:00–18:00, sáb 08:00–12:00, dom fechado (o lava-rápido desligado tem o mesmo horário).
    for (const lavaRapidoId of [comHorarioId, desligadoId]) {
      await prisma.horarioFuncionamento.createMany({
        data: [
          { lavaRapidoId, diaSemana: 0, fechado: true },
          ...[1, 2, 3, 4, 5].map((diaSemana) => ({ lavaRapidoId, diaSemana, abertura: '08:00', fechamento: '18:00' })),
          { lavaRapidoId, diaSemana: 6, abertura: '08:00', fechamento: '12:00' },
        ],
      })
    }
  })

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AGORA)
  })

  afterEach(async () => {
    vi.useRealTimers()
    await prisma.intercorrencia.deleteMany({ where: { lavaRapidoId: { in: [comHorarioId, semHorarioId, desligadoId] } } })
  })

  afterAll(async () => {
    await limparDadosDeTeste()
    await prisma.$disconnect()
  })

  async function buscar(horario: string) {
    return supertest(app).get('/lavaRapidos').query({ horario })
  }

  it('dentro do horário de funcionamento: aparece; coluna isOpen desligada: não aparece', async () => {
    const res = await buscar(TERCA_10H)
    expect(res.status).toBe(200)
    const ids = idsDa(res.body)
    expect(ids).toContain(comHorarioId)
    expect(ids).toContain(semHorarioId) // sem horário cadastrado = sem restrição
    expect(ids).not.toContain(desligadoId)
  })

  it('aceita o horário em UTC (Z) — mesmo instante', async () => {
    const res = await buscar('2026-11-03T13:00:00Z') // 10:00 em São Paulo
    expect(idsDa(res.body)).toContain(comHorarioId)
  })

  it('fora do horário de funcionamento: não aparece', async () => {
    const ids = idsDa((await buscar(TERCA_19H)).body)
    expect(ids).not.toContain(comHorarioId)
    expect(ids).toContain(semHorarioId)
  })

  it('dia fechado: não aparece', async () => {
    const ids = idsDa((await buscar(DOMINGO_10H)).body)
    expect(ids).not.toContain(comHorarioId)
  })

  it('intercorrência de dia inteiro: não aparece', async () => {
    await prisma.intercorrencia.create({ data: { lavaRapidoId: comHorarioId, data: '2026-11-03', motivo: 'Folga' } })
    await prisma.intercorrencia.create({ data: { lavaRapidoId: semHorarioId, data: '2026-11-03', motivo: 'Folga' } })
    const ids = idsDa((await buscar(TERCA_10H)).body)
    expect(ids).not.toContain(comHorarioId)
    expect(ids).not.toContain(semHorarioId)
  })

  it('intercorrência parcial cobrindo o instante: não aparece; fora do instante: aparece', async () => {
    await prisma.intercorrencia.create({
      data: { lavaRapidoId: comHorarioId, data: '2026-11-03', motivo: 'Manutenção', diaInteiro: false, horaInicio: '09:30', horaFim: '11:00' },
    })
    expect(idsDa((await buscar(TERCA_10H)).body)).not.toContain(comHorarioId)
    expect(idsDa((await buscar('2026-11-03T11:00:00-03:00')).body)).toContain(comHorarioId)
  })

  it('intercorrência reaberta: aparece', async () => {
    await prisma.intercorrencia.create({ data: { lavaRapidoId: comHorarioId, data: '2026-11-03', motivo: 'Folga', reaberta: true } })
    expect(idsDa((await buscar(TERCA_10H)).body)).toContain(comHorarioId)
  })

  it('isOpen da resposta continua sendo "aberto agora"', async () => {
    // Agora (segunda 09:00) está aberto; a intercorrência de hoje fecha agora, não terça.
    await prisma.intercorrencia.create({ data: { lavaRapidoId: comHorarioId, data: '2026-11-02', motivo: 'Folga' } })
    const res = await buscar(TERCA_10H)
    expect(res.body.find((lavaRapido: { id: string }) => lavaRapido.id === comHorarioId)).toMatchObject({ isOpen: false })
  })

  it('sem horario: lista todos, inclusive os fechados', async () => {
    vi.setSystemTime(new Date(TERCA_19H))
    const res = await supertest(app).get('/lavaRapidos')
    expect(res.status).toBe(200)
    const ids = idsDa(res.body)
    expect(ids).toEqual(expect.arrayContaining([comHorarioId, semHorarioId, desligadoId]))
    expect(res.body.find((lavaRapido: { id: string }) => lavaRapido.id === comHorarioId)).toMatchObject({ isOpen: false })
  })

  it('não expõe senha nem e-mail na busca por horário', async () => {
    const res = await buscar(TERCA_10H)
    const item = res.body.find((lavaRapido: { id: string }) => lavaRapido.id === comHorarioId)
    expect(item).not.toHaveProperty('senha')
    expect(item).not.toHaveProperty('senhaGerada')
    expect(item).not.toHaveProperty('email')
  })

  describe('validação do horario', () => {
    it.each([
      ['malformado', 'amanhã às 10'],
      ['sem fuso', '2026-11-03T10:00:00'],
      ['data inexistente', '2026-02-31T10:00:00-03:00'],
      ['vazio', ''],
    ])('%s: 400', async (_caso, horario) => {
      const res = await buscar(horario)
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/horario inválido/)
    })

    it('no passado: 400 (com tolerância de 1 minuto)', async () => {
      const passado = await buscar('2026-11-02T08:30:00-03:00')
      expect(passado.status).toBe(400)
      expect(passado.body.error).toMatch(/passado/)

      const quaseAgora = await buscar('2026-11-02T08:59:30-03:00')
      expect(quaseAgora.status).toBe(200)
    })

    it('até 30 dias à frente: 200; além disso: 400', async () => {
      expect((await buscar('2026-12-02T09:00:00-03:00')).status).toBe(200)
      const longe = await buscar('2026-12-02T09:30:00-03:00')
      expect(longe.status).toBe(400)
      expect(longe.body.error).toMatch(/30 dias/)
    })

    it('parâmetro repetido usa o primeiro valor', async () => {
      const res = await supertest(app).get(`/lavaRapidos?horario=${encodeURIComponent(TERCA_10H)}&horario=x`)
      expect(res.status).toBe(200)
    })
  })
})
