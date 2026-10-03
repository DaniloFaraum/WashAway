import { describe, expect, it } from 'vitest'
import { diasAte, getIntercorrenciaRelevante } from '../features/intercorrencias/useIntercorrencias'
import type { Intercorrencia } from '../features/intercorrencias/service/intercorrencias.model'

const HOJE = new Date('2026-09-26T10:00:00')

function intercorrencia(overrides: Partial<Intercorrencia>): Intercorrencia {
  return {
    id: '1',
    lavaRapidoId: '1',
    data: '2026-09-26',
    motivo: 'Motivo',
    diaInteiro: true,
    horaInicio: null,
    horaFim: null,
    ...overrides,
  }
}

describe('diasAte', () => {
  it('retorna 0 pra hoje, positivo pro futuro e negativo pro passado', () => {
    expect(diasAte('2026-09-26', HOJE)).toBe(0)
    expect(diasAte('2026-09-29', HOJE)).toBe(3)
    expect(diasAte('2026-09-20', HOJE)).toBe(-6)
  })
})

describe('getIntercorrenciaRelevante', () => {
  it('retorna a intercorrência de hoje quando existir', () => {
    const intercorrencias = [
      intercorrencia({ id: '1', data: '2026-09-26', motivo: 'Folga' }),
      intercorrencia({ id: '2', data: '2026-09-29', motivo: 'Feriado' }),
    ]

    expect(getIntercorrenciaRelevante(intercorrencias, HOJE)?.id).toBe('1')
  })

  it('retorna a mais próxima dentro dos próximos 3 dias quando não há uma pra hoje', () => {
    const intercorrencias = [
      intercorrencia({ id: '1', data: '2026-09-29', motivo: 'Feriado' }),
      intercorrencia({ id: '2', data: '2026-09-28', motivo: 'Manutenção' }),
    ]

    expect(getIntercorrenciaRelevante(intercorrencias, HOJE)?.id).toBe('2')
  })

  it('ignora intercorrências passadas ou além da janela de aviso', () => {
    const intercorrencias = [
      intercorrencia({ id: '1', data: '2026-09-20', motivo: 'Passado' }),
      intercorrencia({ id: '2', data: '2026-10-12', motivo: 'Muito no futuro' }),
    ]

    expect(getIntercorrenciaRelevante(intercorrencias, HOJE)).toBeNull()
  })

  it('retorna null quando não há intercorrências', () => {
    expect(getIntercorrenciaRelevante([], HOJE)).toBeNull()
  })
})
