import { describe, expect, it } from 'vitest'
import { parseHorariosInput } from './horarios.validation.js'

// Semana padrão: dom fechado, seg–sex 08:00–18:00, sáb 08:00–12:00.
function semana() {
  return [
    { diaSemana: 0, fechado: true },
    ...[1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, fechado: false, abertura: '08:00', fechamento: '18:00' })),
    { diaSemana: 6, fechado: false, abertura: '08:00', fechamento: '12:00' },
  ] as Record<string, unknown>[]
}

function erro(dias: unknown) {
  const resultado = parseHorariosInput({ dias })
  return resultado.ok ? null : resultado.erro
}

describe('parseHorariosInput', () => {
  it('aceita os 7 dias e devolve na ordem 0 a 6, com null nos dias fechados', () => {
    const resultado = parseHorariosInput({ dias: semana().reverse() })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.dias.map((dia) => dia.diaSemana)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(resultado.dias[0]).toEqual({ diaSemana: 0, fechado: true, abertura: null, fechamento: null })
    expect(resultado.dias[6]).toEqual({ diaSemana: 6, fechado: false, abertura: '08:00', fechamento: '12:00' })
  })

  it('aceita dia fechado com abertura/fechamento null', () => {
    const dias = semana()
    dias[0] = { diaSemana: 0, fechado: true, abertura: null, fechamento: null }
    expect(parseHorariosInput({ dias }).ok).toBe(true)
  })

  it('recusa body sem a lista de dias', () => {
    expect(parseHorariosInput({}).ok).toBe(false)
    expect(parseHorariosInput(null).ok).toBe(false)
    expect(parseHorariosInput({ dias: 'x' }).ok).toBe(false)
  })

  it('abertura igual ou depois do fechamento', () => {
    const dias = semana()
    dias[1] = { diaSemana: 1, fechado: false, abertura: '18:00', fechamento: '08:00' }
    expect(erro(dias)).toBe('Abertura de segunda deve ser antes do fechamento')
    dias[1] = { diaSemana: 1, fechado: false, abertura: '08:00', fechamento: '08:00' }
    expect(erro(dias)).toBe('Abertura de segunda deve ser antes do fechamento')
  })

  it('formato de hora inválido', () => {
    for (const abertura of ['8:00', '24:00', '08:60', '0800', 800]) {
      const dias = semana()
      dias[2] = { diaSemana: 2, fechado: false, abertura, fechamento: '18:00' }
      expect(erro(dias)).toBe('Horário de terça deve estar no formato HH:mm (00:00 a 23:59)')
    }
  })

  it('dia aberto sem abertura ou fechamento', () => {
    const dias = semana()
    dias[3] = { diaSemana: 3, fechado: false, abertura: '08:00' }
    expect(erro(dias)).toBe('Informe abertura e fechamento de quarta')
  })

  it('dia fechado com abertura ou fechamento', () => {
    const dias = semana()
    dias[0] = { diaSemana: 0, fechado: true, abertura: '08:00', fechamento: '12:00' }
    expect(erro(dias)).toBe('Dia fechado (domingo) não pode ter abertura nem fechamento')
  })

  it('diaSemana fora de 0..6', () => {
    const dias = semana()
    dias[6] = { diaSemana: 7, fechado: true }
    expect(erro(dias)).toBe('diaSemana deve ser um número de 0 (domingo) a 6 (sábado)')
  })

  it('dia repetido', () => {
    const dias = semana()
    dias[6] = { diaSemana: 5, fechado: true }
    expect(erro(dias)).toBe('O dia sexta foi informado mais de uma vez')
  })

  it('dia faltando', () => {
    expect(erro(semana().slice(0, 6))).toBe('Informe os 7 dias da semana (faltando: sábado)')
  })

  it('fechado precisa ser booleano', () => {
    const dias = semana()
    dias[4] = { diaSemana: 4, abertura: '08:00', fechamento: '18:00' }
    expect(erro(dias)).toBe('Informe se quinta está fechado (fechado: true/false)')
  })
})
