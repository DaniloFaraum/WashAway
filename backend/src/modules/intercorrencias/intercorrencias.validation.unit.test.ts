import { describe, expect, it } from 'vitest'
import { parseIntercorrenciaInput } from './intercorrencias.validation.js'

// Exemplo de teste unitário (`*.unit.test.ts`): regra pura, sem banco nem rede.
// Roda com `npm run test:unit`.
describe('parseIntercorrenciaInput', () => {
  const base = { lavaRapidoId: 'lr-1', data: '2026-10-12', motivo: 'Feriado' }

  it('aceita intercorrência de dia inteiro sem horários', () => {
    expect(parseIntercorrenciaInput({ ...base, diaInteiro: true })).toEqual({ ...base, diaInteiro: true })
  })

  it('aceita intercorrência parcial com horaInicio e horaFim', () => {
    const input = { ...base, diaInteiro: false, horaInicio: '14:00', horaFim: '16:00' }
    expect(parseIntercorrenciaInput(input)).toEqual(input)
  })

  it('recusa horários quando é dia inteiro', () => {
    expect(parseIntercorrenciaInput({ ...base, diaInteiro: true, horaInicio: '08:00' })).toBeNull()
  })

  it('recusa intercorrência parcial sem horaFim', () => {
    expect(parseIntercorrenciaInput({ ...base, diaInteiro: false, horaInicio: '08:00' })).toBeNull()
  })

  it('recusa intercorrência parcial sem horaInicio', () => {
    expect(parseIntercorrenciaInput({ ...base, diaInteiro: false, horaFim: '16:00' })).toBeNull()
  })

  it('recusa diaInteiro que não é booleano', () => {
    expect(parseIntercorrenciaInput({ ...base, diaInteiro: 'true' })).toBeNull()
  })

  it('recusa body que não é objeto ou sem campos obrigatórios', () => {
    expect(parseIntercorrenciaInput(null)).toBeNull()
    expect(parseIntercorrenciaInput('texto')).toBeNull()
    expect(parseIntercorrenciaInput({ ...base, motivo: '', diaInteiro: true })).toBeNull()
  })
})
