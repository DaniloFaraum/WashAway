import { describe, expect, it } from 'vitest'
import { isPlacaValida, normalizarPlaca } from './placa.js'

describe('normalizarPlaca', () => {
  it('remove hífen e espaços e passa para maiúsculas', () => {
    expect(normalizarPlaca('abc-1234')).toBe('ABC1234')
    expect(normalizarPlaca(' abc 1d23 ')).toBe('ABC1D23')
    expect(normalizarPlaca('ABC1D23')).toBe('ABC1D23')
  })
})

describe('isPlacaValida', () => {
  it.each(['ABC1234', 'abc-1234', 'ABC-1234', ' abc 1234 '])('formato antigo válido (%s)', (placa) => {
    expect(isPlacaValida(placa)).toBe(true)
  })

  it.each(['ABC1D23', 'abc1d23', 'abc-1d23'])('formato Mercosul válido (%s)', (placa) => {
    expect(isPlacaValida(placa)).toBe(true)
  })

  it.each(['', 'AB12345', 'ABCD123', 'ABC123', 'ABC12345', 'ABC1DD3', '1BC1234', 'ÁBC1234', 'ABC_1234'])(
    'formato inválido (%s)',
    (placa) => {
      expect(isPlacaValida(placa)).toBe(false)
    },
  )
})
