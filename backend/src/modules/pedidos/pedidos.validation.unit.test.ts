import type { Intercorrencia } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { estaAberto } from '../horarios/disponibilidade.service.js'
import {
  isIsoComFusoValido,
  mensagemHorarioIndisponivel,
  validarCriacaoPedido,
  validarHorarioPedido,
} from './pedidos.validation.js'

// `validarHorarioPedido` consulta o banco via `estaAberto` (I19); aqui ele é simulado.
vi.mock('../horarios/disponibilidade.service.js', () => ({ estaAberto: vi.fn() }))

const BASE = { lavaRapidoId: 'lr', veiculoId: 'v', servicoIds: ['s1', 's2'], horario: '2030-01-10T10:00:00-03:00' }

describe('validarCriacaoPedido', () => {
  it('aceita o body completo e lê só os campos do pedido', () => {
    const resultado = validarCriacaoPedido({ ...BASE, precoTotal: 1, clienteId: 'outro' })
    expect(resultado).toEqual({
      dados: { lavaRapidoId: 'lr', veiculoId: 'v', servicoIds: ['s1', 's2'], horario: new Date('2030-01-10T13:00:00Z') },
    })
  })

  it.each([
    ['sem body', undefined],
    ['sem lava-rápido', { ...BASE, lavaRapidoId: ' ' }],
    ['sem veículo', { ...BASE, veiculoId: 1 }],
    ['lista vazia', { ...BASE, servicoIds: [] }],
    ['lista repetida', { ...BASE, servicoIds: ['s1', 's1'] }],
    ['id vazio', { ...BASE, servicoIds: ['s1', ''] }],
    ['mais de 20 serviços', { ...BASE, servicoIds: Array.from({ length: 21 }, (_, i) => `s${i}`) }],
    ['horário sem fuso', { ...BASE, horario: '2030-01-10T10:00:00' }],
    ['horário número', { ...BASE, horario: Date.now() }],
  ])('recusa %s com DADOS_INVALIDOS', (_nome, body) => {
    const resultado = validarCriacaoPedido(body)
    expect('erro' in resultado && resultado.erro).toMatchObject({ status: 400, codigo: 'DADOS_INVALIDOS' })
  })
})

describe('isIsoComFusoValido', () => {
  it.each(['2030-01-10T10:00Z', '2030-01-10T10:00:00.000Z', '2030-02-28T23:59:59-03:00', '2028-02-29T10:00:00+00:00'])(
    'aceita %s',
    (texto) => expect(isIsoComFusoValido(texto)).toBe(true),
  )

  it.each(['2030-02-31T10:00:00Z', '2030-02-29T10:00:00Z', '2030-13-01T10:00:00Z', '2030-01-10T24:00:00Z', '2030-01-10', 'x'])(
    'recusa %s',
    (texto) => expect(isIsoComFusoValido(texto)).toBe(false),
  )
})

describe('validarHorarioPedido', () => {
  const agora = new Date('2030-01-10T12:00:00Z')
  const estaAbertoMock = vi.mocked(estaAberto)

  beforeEach(() => {
    estaAbertoMock.mockReset()
    estaAbertoMock.mockResolvedValue({ aberto: true })
  })

  it('aceita horário no futuro com o lava-rápido aberto no período', async () => {
    const inicio = new Date('2030-01-10T12:30:00Z')
    expect(await validarHorarioPedido('lr', inicio, 30, agora)).toBeNull()
    expect(estaAbertoMock).toHaveBeenCalledWith('lr', inicio, new Date('2030-01-10T13:00:00Z'))
  })

  it('com duração 0 avalia só o instante de início', async () => {
    const inicio = new Date('2030-01-10T12:30:00Z')
    await validarHorarioPedido('lr', inicio, 0, agora)
    expect(estaAbertoMock).toHaveBeenCalledWith('lr', inicio, undefined)
  })

  it('recusa agora ou no passado com HORARIO_PASSADO, sem consultar o horário', async () => {
    for (const inicio of [agora, new Date('2030-01-09T12:00:00Z')]) {
      expect(await validarHorarioPedido('lr', inicio, 30, agora)).toMatchObject({ status: 400, codigo: 'HORARIO_PASSADO' })
    }
    expect(estaAbertoMock).not.toHaveBeenCalled()
  })

  it('recusa com HORARIO_INDISPONIVEL quando o lava-rápido está fechado no período', async () => {
    estaAbertoMock.mockResolvedValue({ aberto: false, motivo: { tipo: 'fora_do_horario', horario: null } })
    expect(await validarHorarioPedido('lr', new Date('2030-01-10T12:30:00Z'), 30, agora)).toEqual({
      status: 400,
      error: 'O lava-rápido não abre nesse dia.',
      codigo: 'HORARIO_INDISPONIVEL',
    })
  })
})

describe('mensagemHorarioIndisponivel (hora local de São Paulo)', () => {
  const HORARIO = { abertura: '08:00', fechamento: '18:00' }
  const local = (texto: string) => new Date(`${texto}-03:00`)

  function intercorrencia(dados: Partial<Intercorrencia>): Intercorrencia {
    return {
      id: 'i', lavaRapidoId: 'lr', data: '2030-01-14', motivo: 'Manutenção',
      diaInteiro: true, horaInicio: null, horaFim: null, reaberta: false, ...dados,
    }
  }

  it('dia fechado', () => {
    const motivo = { tipo: 'fora_do_horario', horario: null } as const
    expect(mensagemHorarioIndisponivel(motivo, local('2030-01-13T10:00'), local('2030-01-13T10:30'))).toBe(
      'O lava-rápido não abre nesse dia.',
    )
  })

  it('começa antes de abrir', () => {
    const motivo = { tipo: 'fora_do_horario', horario: HORARIO } as const
    expect(mensagemHorarioIndisponivel(motivo, local('2030-01-14T07:30'), local('2030-01-14T08:30'))).toBe(
      'Nesse dia o lava-rápido abre às 08:00.',
    )
  })

  it('termina depois de fechar', () => {
    const motivo = { tipo: 'fora_do_horario', horario: HORARIO } as const
    expect(mensagemHorarioIndisponivel(motivo, local('2030-01-14T17:30'), local('2030-01-14T18:30'))).toBe(
      'Nesse dia o lava-rápido fecha às 18:00. O atendimento escolhido termina às 18:30.',
    )
  })

  it('atravessa a meia-noite (mesmo sem horário no dia)', () => {
    const motivo = { tipo: 'fora_do_horario', horario: null } as const
    expect(mensagemHorarioIndisponivel(motivo, local('2030-01-14T23:30'), local('2030-01-15T00:30'))).toBe(
      'O atendimento escolhido termina só no dia seguinte, às 00:30. Escolha um horário mais cedo.',
    )
  })

  it('intercorrência de dia inteiro', () => {
    const motivo = { tipo: 'intercorrencia', intercorrencia: intercorrencia({}) } as const
    expect(mensagemHorarioIndisponivel(motivo, local('2030-01-14T10:00'), local('2030-01-14T10:30'))).toBe(
      'O lava-rápido estará fechado nesse dia: Manutenção.',
    )
  })

  it('intercorrência parcial', () => {
    const motivo = {
      tipo: 'intercorrencia',
      intercorrencia: intercorrencia({ diaInteiro: false, horaInicio: '14:00', horaFim: '16:00', motivo: 'Falta de água' }),
    } as const
    expect(mensagemHorarioIndisponivel(motivo, local('2030-01-14T15:00'), local('2030-01-14T15:30'))).toBe(
      'O lava-rápido estará fechado das 14:00 às 16:00 nesse dia: Falta de água.',
    )
  })
})
