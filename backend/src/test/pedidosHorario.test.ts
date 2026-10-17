import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { partesLocais } from '../utils/fusoHorario.js'
import { comToken, tokenDeCliente } from './helpers/auth.js'
import {
  criarClienteTeste,
  criarItemServicoTeste,
  criarLavaRapidoTeste,
  criarServicoTeste,
  criarVeiculoTeste,
} from './helpers/factories.js'
import { limparDadosDeTeste } from './helpers/limpeza.js'

// I20: POST /pedidos recusa (400, HORARIO_INDISPONIVEL) o período
// [horario, horario + duração dos serviços) fora do horário de funcionamento do
// dia ou num fechamento não reaberto (estaAberto do I19).

const app = createApp()

const DIA_MS = 24 * 60 * 60 * 1000

/**
 * Datas "YYYY-MM-DD" (São Paulo) da segunda-feira pelo menos 7 dias à frente e
 * do domingo seguinte — futuras e conhecidas, sem depender do fuso da máquina.
 */
function proximaSegundaEDomingo(): { segunda: string; domingo: string } {
  let instante = new Date(Date.now() + 7 * DIA_MS)
  while (partesLocais(instante).diaSemana !== 1) instante = new Date(instante.getTime() + DIA_MS)
  return { segunda: partesLocais(instante).data, domingo: partesLocais(new Date(instante.getTime() + 6 * DIA_MS)).data }
}

/** ISO com o fuso de São Paulo (-03:00, sem horário de verão desde 2019). */
const emSaoPaulo = (data: string, hora: string) => `${data}T${hora}:00-03:00`

describe('POST /pedidos: validação do horário (I20)', () => {
  const { segunda, domingo } = proximaSegundaEDomingo()
  let lavaRapidoId: string
  let veiculoId: string
  let servicoId: string // 30 min
  let tokenCliente: string

  beforeAll(async () => {
    lavaRapidoId = (await criarLavaRapidoTeste()).id
    await prisma.horarioFuncionamento.createMany({
      data: [
        { lavaRapidoId, diaSemana: 0, fechado: true },
        ...[1, 2, 3, 4, 5, 6].map((diaSemana) => ({ lavaRapidoId, diaSemana, abertura: '08:00', fechamento: '18:00' })),
      ],
    })
    const item = await criarItemServicoTeste({ duracaoMinutos: 30 })
    servicoId = (await criarServicoTeste(lavaRapidoId, { itemIds: [item.id] })).id

    const cliente = await criarClienteTeste()
    tokenCliente = tokenDeCliente(cliente)
    veiculoId = (await criarVeiculoTeste(cliente.id)).id
  })

  afterEach(async () => {
    await prisma.intercorrencia.deleteMany({ where: { lavaRapidoId } })
  })

  afterAll(async () => {
    // Pedidos criados pela API saem antes do cliente/veículo (Restrict).
    await prisma.pedido.deleteMany({ where: { lavaRapidoId } })
    await limparDadosDeTeste()
    await prisma.$disconnect()
  })

  function postar(horario: string) {
    return comToken(supertest(app).post('/pedidos'), tokenCliente).send({
      lavaRapidoId,
      veiculoId,
      servicoIds: [servicoId],
      horario,
    })
  }

  it('dentro do horário (termina exatamente no fechamento): 201', async () => {
    const response = await postar(emSaoPaulo(segunda, '17:30'))

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ status: 'pendente', duracaoMinutos: 30 })
  })

  it('começando antes de abrir: 400 "abre às"', async () => {
    const response = await postar(emSaoPaulo(segunda, '07:45'))

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ codigo: 'HORARIO_INDISPONIVEL', error: 'Nesse dia o lava-rápido abre às 08:00.' })
  })

  it('terminando depois de fechar (começa dentro, a duração estoura): 400 "fecha às"', async () => {
    const response = await postar(emSaoPaulo(segunda, '17:45'))

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      codigo: 'HORARIO_INDISPONIVEL',
      error: 'Nesse dia o lava-rápido fecha às 18:00. O atendimento escolhido termina às 18:15.',
    })
  })

  it('dia fechado (domingo com fechado: true): 400', async () => {
    const response = await postar(emSaoPaulo(domingo, '10:00'))

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ codigo: 'HORARIO_INDISPONIVEL', error: 'O lava-rápido não abre nesse dia.' })
  })

  it('fechamento parcial (intercorrência 14:00–16:00 interceptando): 400', async () => {
    await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: segunda, motivo: 'Falta de água', diaInteiro: false, horaInicio: '14:00', horaFim: '16:00' },
    })

    const response = await postar(emSaoPaulo(segunda, '13:45'))

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      codigo: 'HORARIO_INDISPONIVEL',
      error: 'O lava-rápido estará fechado das 14:00 às 16:00 nesse dia: Falta de água.',
    })
  })

  it('intercorrência de dia inteiro: 400', async () => {
    await prisma.intercorrencia.create({ data: { lavaRapidoId, data: segunda, motivo: 'Feriado local' } })

    const response = await postar(emSaoPaulo(segunda, '10:00'))

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ codigo: 'HORARIO_INDISPONIVEL', error: 'O lava-rápido estará fechado nesse dia: Feriado local.' })
  })

  it('intercorrência reaberta (mesma 14:00–16:00 com reaberta: true): 201', async () => {
    await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: segunda, motivo: 'Falta de água', diaInteiro: false, horaInicio: '14:00', horaFim: '16:00', reaberta: true },
    })

    const response = await postar(emSaoPaulo(segunda, '13:45'))

    expect(response.status).toBe(201)
  })

  it('horário no passado continua HORARIO_PASSADO (validação do I13 antes do horário)', async () => {
    const response = await postar(new Date(Date.now() - DIA_MS).toISOString())

    expect(response.status).toBe(400)
    expect(response.body.codigo).toBe('HORARIO_PASSADO')
  })
})
