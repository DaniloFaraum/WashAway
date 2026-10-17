import { describe, expect, it } from 'vitest'
import { validarHorarioBusca } from './lavaRapidos.validation.js'

// Sem banco: regra do `?horario=` da busca por horário (I9).
const AGORA = new Date('2026-11-02T12:00:00Z') // 09:00 em São Paulo

describe('validarHorarioBusca', () => {
  it('aceita ISO com offset ou Z no futuro e devolve o instante', () => {
    expect(validarHorarioBusca('2026-11-03T10:00:00-03:00', AGORA)).toEqual({ horario: new Date('2026-11-03T13:00:00Z') })
    expect(validarHorarioBusca('2026-11-03T13:00Z', AGORA)).toEqual({ horario: new Date('2026-11-03T13:00:00Z') })
  })

  it('recusa sem fuso, malformado ou data inexistente', () => {
    for (const texto of ['2026-11-03T10:00:00', '2026-11-03', 'x', '', '2026-11-31T10:00:00-03:00']) {
      expect(validarHorarioBusca(texto, AGORA)).toMatchObject({ erro: expect.stringMatching(/inválido/) })
    }
  })

  it('passado: tolerância de 1 minuto', () => {
    expect(validarHorarioBusca('2026-11-02T11:59:00Z', AGORA)).toHaveProperty('horario')
    expect(validarHorarioBusca('2026-11-02T11:58:59Z', AGORA)).toEqual({ erro: 'horario no passado' })
  })

  it('até 30 dias à frente', () => {
    expect(validarHorarioBusca('2026-12-02T12:00:00Z', AGORA)).toHaveProperty('horario')
    expect(validarHorarioBusca('2026-12-02T12:00:01Z', AGORA)).toMatchObject({ erro: expect.stringMatching(/30 dias/) })
  })
})
