import { describe, expect, it } from 'vitest'
import { normalizeLavaRapido } from '../features/lava-rapidos/service/lavaRapidos.model'

const base = { id: 'lr1', name: 'Lava Teste', isOpen: true, price: 40 }

describe('normalizeLavaRapido — horarios (I19)', () => {
  it('normaliza os dias vindos de GET /lavaRapidos/:id', () => {
    const lavaRapido = normalizeLavaRapido({
      ...base,
      horarios: [
        { diaSemana: 0, fechado: true, abertura: null, fechamento: null, definido: true },
        { diaSemana: '1', fechado: false, abertura: '08:00', fechamento: '18:00', definido: true },
        { diaSemana: 2, fechado: false, abertura: null, fechamento: null, definido: false },
      ],
    })

    expect(lavaRapido.horarios).toEqual([
      { diaSemana: 0, fechado: true, abertura: null, fechamento: null, definido: true },
      { diaSemana: 1, fechado: false, abertura: '08:00', fechamento: '18:00', definido: true },
      { diaSemana: 2, fechado: false, abertura: null, fechamento: null, definido: false },
    ])
  })

  it('sem `definido` no payload, trata o dia como definido', () => {
    const lavaRapido = normalizeLavaRapido({ ...base, horarios: [{ diaSemana: 3, abertura: '09:00', fechamento: '17:00' }] })
    expect(lavaRapido.horarios[0]).toEqual({ diaSemana: 3, fechado: false, abertura: '09:00', fechamento: '17:00', definido: true })
  })

  it('sem `horarios` (listagem), devolve []', () => {
    expect(normalizeLavaRapido(base).horarios).toEqual([])
  })
})
