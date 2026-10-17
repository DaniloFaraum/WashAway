import { describe, expect, it } from 'vitest'
import { isIsoComFusoValido, validarCriacaoPedido, validarHorarioPedido } from './pedidos.validation.js'

const BASE = { lavaRapidoId: 'lr', veiculoId: 'v', servicoIds: ['s1', 's2'], horario: '2030-01-10T10:00:00-03:00' }

describe('validarCriacaoPedido', () => {
  it('aceita o body completo e lê só os campos do pedido', () => {
    const resultado = validarCriacaoPedido({ ...BASE, precoTotal: 1, clienteId: 'outro' })
    expect(resultado).toEqual({
      dados: { lavaRapidoId: 'lr', veiculoId: 'v', servicoIds: ['s1', 's2'], horario: new Date('2030-01-10T13:00:00Z') },
    })
  })

  it.each([
    ['sem body', undefined],
    ['sem lava-rápido', { ...BASE, lavaRapidoId: ' ' }],
    ['sem veículo', { ...BASE, veiculoId: 1 }],
    ['lista vazia', { ...BASE, servicoIds: [] }],
    ['lista repetida', { ...BASE, servicoIds: ['s1', 's1'] }],
    ['id vazio', { ...BASE, servicoIds: ['s1', ''] }],
    ['mais de 20 serviços', { ...BASE, servicoIds: Array.from({ length: 21 }, (_, i) => `s${i}`) }],
    ['horário sem fuso', { ...BASE, horario: '2030-01-10T10:00:00' }],
    ['horário número', { ...BASE, horario: Date.now() }],
  ])('recusa %s com DADOS_INVALIDOS', (_nome, body) => {
    const resultado = validarCriacaoPedido(body)
    expect('erro' in resultado && resultado.erro).toMatchObject({ status: 400, codigo: 'DADOS_INVALIDOS' })
  })
})

describe('isIsoComFusoValido', () => {
  it.each(['2030-01-10T10:00Z', '2030-01-10T10:00:00.000Z', '2030-02-28T23:59:59-03:00', '2028-02-29T10:00:00+00:00'])(
    'aceita %s',
    (texto) => expect(isIsoComFusoValido(texto)).toBe(true),
  )

  it.each(['2030-02-31T10:00:00Z', '2030-02-29T10:00:00Z', '2030-13-01T10:00:00Z', '2030-01-10T24:00:00Z', '2030-01-10', 'x'])(
    'recusa %s',
    (texto) => expect(isIsoComFusoValido(texto)).toBe(false),
  )
})

describe('validarHorarioPedido', () => {
  const agora = new Date('2030-01-10T12:00:00Z')

  it('aceita horário no futuro', async () => {
    expect(await validarHorarioPedido('lr', new Date('2030-01-10T12:30:00Z'), 30, agora)).toBeNull()
  })

  it('recusa agora ou no passado com HORARIO_PASSADO', async () => {
    for (const inicio of [agora, new Date('2030-01-09T12:00:00Z')]) {
      expect(await validarHorarioPedido('lr', inicio, 30, agora)).toMatchObject({ status: 400, codigo: 'HORARIO_PASSADO' })
    }
  })
})
