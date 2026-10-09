import { describe, expect, it } from 'vitest'
import {
  diaSemanaNoFuso,
  formatarHorarioDoDia,
  horarioDeHoje,
  resumirSemana,
  temHorarioDefinido,
} from '../features/lava-rapidos/formatarHorario'
import type { HorarioDia } from '../features/lava-rapidos/service/lavaRapidos.model'

const aberto = (diaSemana: number, abertura: string, fechamento: string): HorarioDia => ({
  diaSemana, fechado: false, abertura, fechamento, definido: true,
})
const fechado = (diaSemana: number): HorarioDia => ({ diaSemana, fechado: true, abertura: null, fechamento: null, definido: true })
const naoDefinido = (diaSemana: number): HorarioDia => ({ diaSemana, fechado: false, abertura: null, fechamento: null, definido: false })

const PADRAO: HorarioDia[] = [
  fechado(0),
  aberto(1, '08:00', '18:00'),
  aberto(2, '08:00', '18:00'),
  aberto(3, '08:00', '18:00'),
  aberto(4, '08:00', '18:00'),
  aberto(5, '08:00', '18:00'),
  aberto(6, '08:00', '12:00'),
]

describe('formatarHorarioDoDia', () => {
  it('dia aberto: "abertura–fechamento"', () => {
    expect(formatarHorarioDoDia(aberto(1, '08:00', '18:00'))).toBe('08:00–18:00')
  })

  it('dia fechado: "Fechado"', () => {
    expect(formatarHorarioDoDia(fechado(0))).toBe('Fechado')
  })

  it('dia não definido (ou ausente): "Horário não informado"', () => {
    expect(formatarHorarioDoDia(naoDefinido(3))).toBe('Horário não informado')
    expect(formatarHorarioDoDia(undefined)).toBe('Horário não informado')
  })
})

describe('resumirSemana', () => {
  it('agrupa dias seguidos com o mesmo horário, começando na segunda', () => {
    expect(resumirSemana(PADRAO)).toEqual(['Seg a sex: 08:00–18:00', 'Sáb: 08:00–12:00', 'Dom: fechado'])
  })

  it('não agrupa dias iguais que não são seguidos', () => {
    const semana = [...PADRAO]
    semana[3] = fechado(3)
    expect(resumirSemana(semana)).toEqual([
      'Seg a ter: 08:00–18:00',
      'Qua: fechado',
      'Qui a sex: 08:00–18:00',
      'Sáb: 08:00–12:00',
      'Dom: fechado',
    ])
  })

  it('dia não definido aparece como "não informado"', () => {
    const semana = PADRAO.map((dia) => (dia.diaSemana === 6 ? naoDefinido(6) : dia))
    expect(resumirSemana(semana)).toContain('Sáb: não informado')
  })
})

describe('horarioDeHoje / temHorarioDefinido', () => {
  it('pega o dia da semana da data informada', () => {
    // 2026-10-10 é sábado.
    expect(horarioDeHoje(PADRAO, new Date(2026, 9, 10, 10, 0))).toEqual(aberto(6, '08:00', '12:00'))
  })

  it('usa o dia no fuso dos lava-rápidos (America/Sao_Paulo), não o do aparelho', () => {
    // 2026-10-10T02:30Z é sábado em UTC, mas ainda sexta 23:30 em São Paulo.
    const instante = new Date('2026-10-10T02:30:00Z')
    expect(diaSemanaNoFuso(instante)).toBe(5)
    expect(horarioDeHoje(PADRAO, instante)).toEqual(aberto(5, '08:00', '18:00'))
  })

  it('sem nenhum dia definido não há horário a mostrar', () => {
    expect(temHorarioDefinido([0, 1, 2, 3, 4, 5, 6].map(naoDefinido))).toBe(false)
    expect(temHorarioDefinido(PADRAO)).toBe(true)
    expect(temHorarioDefinido([])).toBe(false)
  })
})
