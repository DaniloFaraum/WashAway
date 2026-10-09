import type { Intercorrencia } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { partesLocais } from '../../utils/fusoHorario.js'
import { avaliarDisponibilidade, type HorarioDoDia } from './disponibilidade.service.js'

// Regra pura de "está aberto?" (I19), sem banco. As consultas (estaAberto,
// listarAbertos) são cobertas em src/test/disponibilidade.test.ts.

const COMERCIAL: HorarioDoDia = { fechado: false, abertura: '08:00', fechamento: '18:00', definido: true }
const DIA_FECHADO: HorarioDoDia = { fechado: true, abertura: null, fechamento: null, definido: true }
const SEM_HORARIO: HorarioDoDia = { fechado: false, abertura: null, fechamento: null, definido: false }

function intercorrencia(campos: Partial<Intercorrencia> = {}): Intercorrencia {
  return {
    id: 'int-1',
    lavaRapidoId: 'lr-1',
    data: '2026-10-09',
    motivo: 'Manutenção',
    diaInteiro: true,
    horaInicio: null,
    horaFim: null,
    reaberta: false,
    ...campos,
  }
}

describe('avaliarDisponibilidade', () => {
  it('dentro do horário: aberto', () => {
    expect(avaliarDisponibilidade(COMERCIAL, [], '10:00')).toEqual({ aberto: true })
    expect(avaliarDisponibilidade(COMERCIAL, [], '08:00')).toEqual({ aberto: true })
  })

  it('antes de abrir: fechado fora do horário, com o horário do dia', () => {
    expect(avaliarDisponibilidade(COMERCIAL, [], '07:59')).toEqual({
      aberto: false,
      motivo: { tipo: 'fora_do_horario', horario: { abertura: '08:00', fechamento: '18:00' } },
    })
  })

  it('depois de fechar (o fechamento já é fechado): fora do horário', () => {
    expect(avaliarDisponibilidade(COMERCIAL, [], '18:00')).toMatchObject({ aberto: false, motivo: { tipo: 'fora_do_horario' } })
    expect(avaliarDisponibilidade(COMERCIAL, [], '23:30')).toMatchObject({ aberto: false, motivo: { tipo: 'fora_do_horario' } })
  })

  it('dia fechado: fora do horário com horario null', () => {
    expect(avaliarDisponibilidade(DIA_FECHADO, [], '10:00')).toEqual({
      aberto: false,
      motivo: { tipo: 'fora_do_horario', horario: null },
    })
  })

  it('sem horário cadastrado: sem restrição (aberto a qualquer hora)', () => {
    expect(avaliarDisponibilidade(SEM_HORARIO, [], '03:00')).toEqual({ aberto: true })
  })

  it('sem horário cadastrado: intercorrência ainda fecha', () => {
    const folga = intercorrencia()
    expect(avaliarDisponibilidade(SEM_HORARIO, [folga], '03:00')).toEqual({
      aberto: false,
      motivo: { tipo: 'intercorrencia', intercorrencia: folga },
    })
  })

  it('intercorrência de dia inteiro: fechado por intercorrência', () => {
    const folga = intercorrencia()
    expect(avaliarDisponibilidade(COMERCIAL, [folga], '10:00')).toEqual({
      aberto: false,
      motivo: { tipo: 'intercorrencia', intercorrencia: folga },
    })
  })

  it('intercorrência parcial interceptando o instante: fechado', () => {
    const parcial = intercorrencia({ diaInteiro: false, horaInicio: '14:00', horaFim: '16:00' })
    expect(avaliarDisponibilidade(COMERCIAL, [parcial], '14:00')).toMatchObject({ aberto: false, motivo: { tipo: 'intercorrencia' } })
    expect(avaliarDisponibilidade(COMERCIAL, [parcial], '15:59')).toMatchObject({ aberto: false })
  })

  it('intercorrência parcial fora do instante: aberto', () => {
    const parcial = intercorrencia({ diaInteiro: false, horaInicio: '14:00', horaFim: '16:00' })
    expect(avaliarDisponibilidade(COMERCIAL, [parcial], '13:59')).toEqual({ aberto: true })
    expect(avaliarDisponibilidade(COMERCIAL, [parcial], '16:00')).toEqual({ aberto: true })
  })

  it('intercorrência reaberta: ignorada', () => {
    const reaberta = intercorrencia({ reaberta: true })
    expect(avaliarDisponibilidade(COMERCIAL, [reaberta], '10:00')).toEqual({ aberto: true })
  })

  describe('com intervalo [inicio, fim)', () => {
    it('intervalo inteiro dentro do horário: aberto', () => {
      expect(avaliarDisponibilidade(COMERCIAL, [], '17:00', '18:00')).toEqual({ aberto: true })
    })

    it('intervalo que passa do fechamento: fora do horário', () => {
      expect(avaliarDisponibilidade(COMERCIAL, [], '17:30', '18:30')).toMatchObject({ aberto: false, motivo: { tipo: 'fora_do_horario' } })
    })

    it('intercorrência parcial que intercepta o intervalo: fechado', () => {
      const parcial = intercorrencia({ diaInteiro: false, horaInicio: '14:00', horaFim: '16:00' })
      expect(avaliarDisponibilidade(COMERCIAL, [parcial], '13:00', '14:30')).toMatchObject({ aberto: false, motivo: { tipo: 'intercorrencia' } })
    })

    it('intervalo que só encosta na intercorrência parcial: aberto', () => {
      const parcial = intercorrencia({ diaInteiro: false, horaInicio: '14:00', horaFim: '16:00' })
      expect(avaliarDisponibilidade(COMERCIAL, [parcial], '13:00', '14:00')).toEqual({ aberto: true })
      expect(avaliarDisponibilidade(COMERCIAL, [parcial], '16:00', '17:00')).toEqual({ aberto: true })
    })
  })
})

describe('partesLocais (fuso America/Sao_Paulo)', () => {
  it('perto da meia-noite UTC ainda é o dia anterior em São Paulo', () => {
    // 02:30Z = 23:30 do dia anterior em São Paulo (UTC-3).
    expect(partesLocais(new Date('2026-10-10T02:30:00Z'))).toEqual({ data: '2026-10-09', diaSemana: 5, hora: '23:30' })
  })

  it('03:00Z já é meia-noite do dia seguinte em São Paulo', () => {
    expect(partesLocais(new Date('2026-10-10T03:00:00Z'))).toEqual({ data: '2026-10-10', diaSemana: 6, hora: '00:00' })
  })

  it('domingo é 0', () => {
    expect(partesLocais(new Date('2026-10-11T15:00:00Z')).diaSemana).toBe(0)
  })
})
