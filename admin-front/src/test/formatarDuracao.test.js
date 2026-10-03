import { describe, expect, it } from 'vitest'
import { formatarDuracao } from '../pages/servicos/formatarDuracao.js'
import { somarDuracao } from '../pages/servicos/service/servicos.model.js'

describe('duração dos serviços', () => {
  it.each([
    [40, '40 min'],
    [60, '1h'],
    [90, '1h 30min'],
  ])('formatarDuracao(%i) → %s', (minutos, esperado) => {
    expect(formatarDuracao(minutos)).toBe(esperado)
  })

  it('somarDuracao soma a duração dos itens do combo', () => {
    expect(somarDuracao([{ duracaoMinutos: 20 }, { duracaoMinutos: 10 }])).toBe(30)
    expect(somarDuracao([])).toBe(0)
  })
})
