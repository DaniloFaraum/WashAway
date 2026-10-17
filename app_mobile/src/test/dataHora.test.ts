import { describe, expect, it } from 'vitest'
import {
  formatarDataHora,
  horariosDisponiveis,
  horariosDoDia,
  isNoFuturo,
  montarHorarioIso,
  partesNoFuso,
  proximosDias,
  separarHorarioIso,
} from '../features/pedidos/dataHora'

// 2026-10-20 (terça) 13:10 UTC = 10:10 em São Paulo
const AGORA = new Date('2026-10-20T13:10:00Z')

describe('dataHora (fuso do negócio, UTC−03:00)', () => {
  it('partesNoFuso converte o instante para a hora de São Paulo, inclusive perto da meia-noite UTC', () => {
    expect(partesNoFuso(AGORA)).toEqual({ data: '2026-10-20', hora: '10:10', diaSemana: 2 })
    // 01:30 UTC do dia 21 ainda é dia 20 em São Paulo
    expect(partesNoFuso(new Date('2026-10-21T01:30:00Z'))).toMatchObject({ data: '2026-10-20', hora: '22:30' })
  })

  it('proximosDias: 30 dias a partir de hoje (local), com Hoje/Amanhã', () => {
    const dias = proximosDias(AGORA)
    expect(dias).toHaveLength(30)
    expect(dias[0]).toEqual({ data: '2026-10-20', rotulo: 'Hoje', diaMes: '20/10' })
    expect(dias[1]).toMatchObject({ data: '2026-10-21', rotulo: 'Amanhã' })
    expect(dias[2]).toMatchObject({ data: '2026-10-22', rotulo: 'qui' })
    expect(dias[29].data).toBe('2026-11-18')
  })

  it('horariosDoDia: de 30 em 30 minutos, de 06:00 a 22:00', () => {
    const horarios = horariosDoDia()
    expect(horarios[0]).toBe('06:00')
    expect(horarios[1]).toBe('06:30')
    expect(horarios.at(-1)).toBe('22:00')
    expect(horarios).toHaveLength(33)
  })

  it('não aceita horário no passado: hoje só sobram os horários depois de agora', () => {
    const hoje = horariosDisponiveis('2026-10-20', AGORA)
    expect(hoje[0]).toBe('10:30')
    expect(hoje).not.toContain('10:00')
    expect(horariosDisponiveis('2026-10-19', AGORA)).toEqual([])
    expect(horariosDisponiveis('2026-10-21', AGORA)).toHaveLength(33)
    expect(isNoFuturo('2026-10-20', '10:00', AGORA)).toBe(false)
    expect(isNoFuturo('2026-10-20', '10:30', AGORA)).toBe(true)
  })

  it('proximosDias começa no dia seguinte local quando já passou da meia-noite em São Paulo', () => {
    expect(proximosDias(new Date('2026-10-21T03:05:00Z'))[0].data).toBe('2026-10-21')
    expect(proximosDias(new Date('2026-10-21T02:55:00Z'))[0].data).toBe('2026-10-20')
  })

  it('montarHorarioIso envia ISO com o offset de São Paulo', () => {
    const iso = montarHorarioIso('2026-10-22', '10:00')
    expect(iso).toBe('2026-10-22T10:00:00-03:00')
    expect(new Date(iso).toISOString()).toBe('2026-10-22T13:00:00.000Z')
  })

  it('formatarDataHora e separarHorarioIso leem o ISO (UTC) no fuso do negócio', () => {
    expect(formatarDataHora('2026-10-22T13:00:00.000Z')).toBe('qui, 22/10 às 10:00')
    expect(separarHorarioIso('2026-10-22T13:00:00.000Z')).toEqual({ data: '2026-10-22', hora: '10:00' })
    expect(separarHorarioIso('lixo')).toBeNull()
    expect(formatarDataHora('lixo')).toBe('')
  })
})
