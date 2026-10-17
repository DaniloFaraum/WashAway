import { describe, expect, it } from 'vitest'
import {
  diaSemanaNoFuso,
  edicaoParaDias,
  formatarHorarioDoDia,
  horariosParaEdicao,
} from '../pages/disponibilidade/horarioFuncionamento.js'
import { normalizeLavaRapido } from '../login/service/lavaRapidos.model.js'

describe('horarioFuncionamento', () => {
  it('formatarHorarioDoDia mostra o intervalo de um dia aberto', () => {
    expect(
      formatarHorarioDoDia({ diaSemana: 1, fechado: false, abertura: '08:00', fechamento: '18:00', definido: true }),
    ).toBe('08:00–18:00')
  })

  it('formatarHorarioDoDia mostra "Fechado" para dia fechado', () => {
    expect(formatarHorarioDoDia({ diaSemana: 0, fechado: true, abertura: null, fechamento: null, definido: true })).toBe(
      'Fechado',
    )
  })

  it('formatarHorarioDoDia mostra "Não informado" para dia sem horário cadastrado', () => {
    expect(formatarHorarioDoDia(undefined)).toBe('Não informado')
    expect(
      formatarHorarioDoDia({ diaSemana: 2, fechado: false, abertura: null, fechamento: null, definido: false }),
    ).toBe('Não informado')
  })

  it('diaSemanaNoFuso usa o fuso de São Paulo, não o UTC', () => {
    // 2026-10-11T02:30Z ainda é sábado (10/10, 23:30) em São Paulo.
    expect(diaSemanaNoFuso(new Date('2026-10-11T02:30:00Z'))).toBe(6)
  })

  it('normalizeLavaRapido guarda foraDoHorario e os horários do backend', () => {
    const empresa = normalizeLavaRapido({
      id: 'lr-1',
      name: 'Lava',
      isOpen: false,
      foraDoHorario: true,
      horarios: [{ diaSemana: 6, fechado: false, abertura: '08:00', fechamento: '12:00', definido: true }],
    })

    expect(empresa.foraDoHorario).toBe(true)
    expect(empresa.horarios).toEqual([
      { diaSemana: 6, fechado: false, abertura: '08:00', fechamento: '12:00', definido: true },
    ])
  })

  it('normalizeLavaRapido devolve horários vazios quando o backend não manda', () => {
    expect(normalizeLavaRapido({ id: 'lr-1' }).horarios).toEqual([])
  })

  it('horariosParaEdicao monta os 7 dias na ordem 0 a 6; dia sem cadastro começa aberto e vazio', () => {
    const edicao = horariosParaEdicao([
      { diaSemana: 1, fechado: false, abertura: '08:00', fechamento: '18:00', definido: true },
      { diaSemana: 0, fechado: true, abertura: null, fechamento: null, definido: true },
      { diaSemana: 3, fechado: false, abertura: null, fechamento: null, definido: false },
    ])

    expect(edicao.map((dia) => dia.diaSemana)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(edicao[0]).toEqual({ diaSemana: 0, fechado: true, abertura: '', fechamento: '' })
    expect(edicao[1]).toEqual({ diaSemana: 1, fechado: false, abertura: '08:00', fechamento: '18:00' })
    expect(edicao[3]).toEqual({ diaSemana: 3, fechado: false, abertura: '', fechamento: '' })
    expect(horariosParaEdicao([])).toHaveLength(7)
  })

  it('edicaoParaDias manda dia fechado sem horas e dia aberto com as horas', () => {
    expect(
      edicaoParaDias([
        { diaSemana: 0, fechado: true, abertura: '08:00', fechamento: '12:00' },
        { diaSemana: 1, fechado: false, abertura: '08:00', fechamento: '18:00' },
      ]),
    ).toEqual([
      { diaSemana: 0, fechado: true },
      { diaSemana: 1, fechado: false, abertura: '08:00', fechamento: '18:00' },
    ])
  })
})
