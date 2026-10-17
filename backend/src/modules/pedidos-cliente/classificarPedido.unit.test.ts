import { describe, expect, it } from 'vitest'
import { classificarPedido } from './classificarPedido.js'

const AGORA = new Date('2026-10-17T12:00:00.000Z')
const FUTURO = new Date('2026-10-20T12:00:00.000Z')
const PASSADO = new Date('2026-10-10T12:00:00.000Z')

describe('classificarPedido (I18)', () => {
  it.each(['pendente', 'aceito', 'em_andamento'] as const)('%s no futuro: proximo', (status) => {
    expect(classificarPedido({ horario: FUTURO, status }, AGORA)).toBe('proximo')
  })

  it.each(['pendente', 'aceito', 'em_andamento', 'concluido', 'recusado'] as const)('%s no passado: anterior', (status) => {
    expect(classificarPedido({ horario: PASSADO, status }, AGORA)).toBe('anterior')
  })

  it('recusado no futuro conta como anterior', () => {
    expect(classificarPedido({ horario: FUTURO, status: 'recusado' }, AGORA)).toBe('anterior')
  })

  it('concluído no futuro conta como anterior', () => {
    expect(classificarPedido({ horario: FUTURO, status: 'concluido' }, AGORA)).toBe('anterior')
  })

  it('horário exatamente agora ainda é próximo', () => {
    expect(classificarPedido({ horario: new Date(AGORA), status: 'pendente' }, AGORA)).toBe('proximo')
  })
})
