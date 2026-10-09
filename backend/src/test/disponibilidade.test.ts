import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { estaAberto, getHorarioDoDia, listarAbertos } from '../modules/horarios/disponibilidade.service.js'

const app = createApp()

function cnpjAleatorio() {
  return Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('')
}

async function criarLavaRapido(name: string, isOpen = true) {
  return prisma.lavaRapido.create({
    data: {
      name,
      cnpj: cnpjAleatorio(),
      senha: 'hash-fake-nao-usado-nestes-testes',
      distance: '1 km',
      time: '5 min',
      price: 0,
      isOpen,
      image: 'https://placehold.co/300x300?text=Teste',
      latitude: 0,
      longitude: 0,
    },
  })
}

// 2026-10-09 é sexta (diaSemana 5); 2026-10-11 é domingo (0). Horas em -03:00 (São Paulo).
const SEXTA_10H = new Date('2026-10-09T10:00:00-03:00')
const SEXTA_07H = new Date('2026-10-09T07:00:00-03:00')
const SEXTA_19H = new Date('2026-10-09T19:00:00-03:00')
const DOMINGO_10H = new Date('2026-10-11T10:00:00-03:00')

describe('disponibilidade (estaAberto / listarAbertos / getHorarioDoDia)', () => {
  const ids: string[] = []
  let comHorarioId: string
  let semHorarioId: string

  beforeAll(async () => {
    const comHorario = await criarLavaRapido('Lava-rápido com horário (disponibilidade)')
    const semHorario = await criarLavaRapido('Lava-rápido sem horário (disponibilidade)')
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

  afterEach(async () => {
    vi.useRealTimers()
    await prisma.intercorrencia.deleteMany({ where: { lavaRapidoId: { in: ids } } })
  })

  afterAll(async () => {
    await prisma.lavaRapido.deleteMany({ where: { id: { in: ids } } })
    await prisma.$disconnect()
  })

  it('dentro do horário: aberto', async () => {
    expect(await estaAberto(comHorarioId, SEXTA_10H)).toEqual({ aberto: true })
  })

  it('antes de abrir e depois de fechar: fora do horário', async () => {
    expect(await estaAberto(comHorarioId, SEXTA_07H)).toEqual({
      aberto: false,
      motivo: { tipo: 'fora_do_horario', horario: { abertura: '08:00', fechamento: '18:00' } },
    })
    expect(await estaAberto(comHorarioId, SEXTA_19H)).toMatchObject({ aberto: false, motivo: { tipo: 'fora_do_horario' } })
  })

  it('dia fechado: fora do horário com horario null', async () => {
    expect(await estaAberto(comHorarioId, DOMINGO_10H)).toEqual({
      aberto: false,
      motivo: { tipo: 'fora_do_horario', horario: null },
    })
  })

  it('sem horário cadastrado: sem restrição', async () => {
    expect(await estaAberto(semHorarioId, new Date('2026-10-09T03:00:00-03:00'))).toEqual({ aberto: true })
  })

  it('intercorrência de dia inteiro (data local) fecha', async () => {
    await prisma.intercorrencia.create({ data: { lavaRapidoId: comHorarioId, data: '2026-10-09', motivo: 'Folga' } })
    expect(await estaAberto(comHorarioId, SEXTA_10H)).toMatchObject({ aberto: false, motivo: { tipo: 'intercorrencia' } })
  })

  it('intercorrência parcial interceptando o intervalo fecha; reaberta não', async () => {
    const parcial = await prisma.intercorrencia.create({
      data: { lavaRapidoId: comHorarioId, data: '2026-10-09', motivo: 'Manutenção', diaInteiro: false, horaInicio: '14:00', horaFim: '16:00' },
    })
    const inicio = new Date('2026-10-09T13:30:00-03:00')
    const fim = new Date('2026-10-09T14:30:00-03:00')
    expect(await estaAberto(comHorarioId, inicio, fim)).toMatchObject({ aberto: false, motivo: { tipo: 'intercorrencia' } })

    await prisma.intercorrencia.update({ where: { id: parcial.id }, data: { reaberta: true } })
    expect(await estaAberto(comHorarioId, inicio, fim)).toEqual({ aberto: true })
  })

  it('intervalo que atravessa a meia-noite local: fechado', async () => {
    const inicio = new Date('2026-10-09T23:30:00-03:00')
    const fim = new Date('2026-10-10T00:30:00-03:00')
    expect(await estaAberto(semHorarioId, inicio, fim)).toMatchObject({ aberto: false, motivo: { tipo: 'fora_do_horario' } })
  })

  it('usa a data local: 02:30Z de sábado ainda é sexta 23:30 em São Paulo', async () => {
    // Intercorrência na sexta (data local): às 02:30Z do sábado ainda vale.
    await prisma.intercorrencia.create({ data: { lavaRapidoId: semHorarioId, data: '2026-10-09', motivo: 'Folga' } })
    expect(await estaAberto(semHorarioId, new Date('2026-10-10T02:30:00Z'))).toMatchObject({ aberto: false })
  })

  it('listarAbertos responde em lote', async () => {
    const mapa = await listarAbertos([comHorarioId, semHorarioId], SEXTA_19H)
    expect(mapa.get(comHorarioId)).toMatchObject({ aberto: false })
    expect(mapa.get(semHorarioId)).toEqual({ aberto: true })
  })

  it('getHorarioDoDia devolve o horário do dia local', async () => {
    expect(await getHorarioDoDia(comHorarioId, SEXTA_10H)).toEqual({ fechado: false, abertura: '08:00', fechamento: '18:00', definido: true })
    expect(await getHorarioDoDia(comHorarioId, DOMINGO_10H)).toMatchObject({ fechado: true, definido: true })
    expect(await getHorarioDoDia(semHorarioId, SEXTA_10H)).toMatchObject({ definido: false })
  })

  describe('isOpen de GET /lavaRapidos respeita o horário (relógio controlado)', () => {
    it('dentro do horário: isOpen true, foraDoHorario false', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(SEXTA_10H)

      const index = await supertest(app).get('/lavaRapidos')
      expect(index.body.find((item: { id: string }) => item.id === comHorarioId).isOpen).toBe(true)

      const show = await supertest(app).get(`/lavaRapidos/${comHorarioId}`)
      expect(show.body).toMatchObject({ isOpen: true, foraDoHorario: false })
    })

    it('fora do horário: isOpen false, foraDoHorario true; sem horário continua aberto', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(SEXTA_19H)

      const index = await supertest(app).get('/lavaRapidos')
      const porId = (id: string) => index.body.find((item: { id: string }) => item.id === id)
      expect(porId(comHorarioId).isOpen).toBe(false)
      expect(porId(semHorarioId).isOpen).toBe(true)

      const show = await supertest(app).get(`/lavaRapidos/${comHorarioId}`)
      expect(show.body).toMatchObject({ isOpen: false, foraDoHorario: true, intercorrenciaAtiva: null })
    })

    it('intercorrência: isOpen false, foraDoHorario false e intercorrenciaAtiva preenchida', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(SEXTA_10H)
      await prisma.intercorrencia.create({ data: { lavaRapidoId: comHorarioId, data: '2026-10-09', motivo: 'Folga' } })

      const show = await supertest(app).get(`/lavaRapidos/${comHorarioId}`)
      expect(show.body).toMatchObject({ isOpen: false, foraDoHorario: false, intercorrenciaAtiva: { motivo: 'Folga' } })
    })
  })
})
