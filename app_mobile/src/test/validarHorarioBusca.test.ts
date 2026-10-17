import { describe, expect, it } from 'vitest'
import { validarHorarioBusca } from '../features/lava-rapidos/validarHorarioBusca'

const AGORA = new Date('2026-10-20T13:10:00Z') // 10:10 em São Paulo
const DIA_MS = 24 * 60 * 60 * 1000

describe('validarHorarioBusca (I9)', () => {
  it('passado ou agora: pede horário no futuro', () => {
    expect(validarHorarioBusca(new Date('2026-10-20T09:00:00-03:00'), AGORA)).toBe('Escolha um horário no futuro')
    expect(validarHorarioBusca(AGORA, AGORA)).toBe('Escolha um horário no futuro')
    expect(validarHorarioBusca(new Date('x'), AGORA)).toBe('Escolha um horário no futuro')
  })

  it('até +30 dias vale; +31 dias não', () => {
    expect(validarHorarioBusca(new Date('2026-10-20T10:30:00-03:00'), AGORA)).toBeNull()
    expect(validarHorarioBusca(new Date(AGORA.getTime() + 30 * DIA_MS), AGORA)).toBeNull()
    expect(validarHorarioBusca(new Date(AGORA.getTime() + 31 * DIA_MS), AGORA)).toBe('Escolha uma data em até 30 dias')
  })
})
