import { PedidoStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  mensagemTransicaoInvalida,
  podeTransicionar,
  validarAtualizacaoStatus,
} from '../modules/pedidos/pedidoStatus.js'

// I15: regra de transição de status do pedido (lógica pura).
const TODOS = Object.values(PedidoStatus)
const VALIDAS: [PedidoStatus, PedidoStatus][] = [
  ['pendente', 'aceito'],
  ['pendente', 'recusado'],
  ['aceito', 'em_andamento'],
  ['em_andamento', 'concluido'],
]

describe('podeTransicionar', () => {
  it.each(VALIDAS)('permite %s → %s', (de, para) => {
    expect(podeTransicionar(de, para)).toBe(true)
  })

  // Todas as outras combinações (inclusive mesmo status → mesmo status).
  const invalidas = TODOS.flatMap((de) => TODOS.map((para) => [de, para] as [PedidoStatus, PedidoStatus])).filter(
    ([de, para]) => !VALIDAS.some(([d, p]) => d === de && p === para),
  )

  it('cobre a tabela inteira (5 × 5)', () => {
    expect(invalidas).toHaveLength(TODOS.length * TODOS.length - VALIDAS.length)
  })

  it.each(invalidas)('recusa %s → %s', (de, para) => {
    expect(podeTransicionar(de, para)).toBe(false)
  })

  it('recusado e concluido são finais', () => {
    for (const para of TODOS) {
      expect(podeTransicionar('recusado', para)).toBe(false)
      expect(podeTransicionar('concluido', para)).toBe(false)
    }
  })
})

describe('mensagemTransicaoInvalida', () => {
  it('diz de onde para onde', () => {
    expect(mensagemTransicaoInvalida('recusado', 'aceito')).toBe('Não é possível mudar de recusado para aceito.')
    expect(mensagemTransicaoInvalida('pendente', 'concluido')).toBe('Não é possível mudar de pendente para concluído.')
    expect(mensagemTransicaoInvalida('pendente', 'em_andamento')).toBe('Não é possível mudar de pendente para em andamento.')
  })

  it('mesmo status', () => {
    expect(mensagemTransicaoInvalida('aceito', 'aceito')).toBe('O pedido já está aceito.')
  })
})

describe('validarAtualizacaoStatus', () => {
  it('aceita status sem motivo', () => {
    expect(validarAtualizacaoStatus({ status: 'aceito' })).toEqual({ dados: { status: 'aceito', motivo: null } })
  })

  it('ignora outros campos do body', () => {
    expect(validarAtualizacaoStatus({ status: 'aceito', precoTotal: 1, lavaRapidoId: 'x' })).toEqual({
      dados: { status: 'aceito', motivo: null },
    })
  })

  it('recusa status inexistente, ausente ou body inválido', () => {
    for (const body of [{ status: 'inexistente' }, {}, null, 'aceito', { status: 1 }]) {
      expect(validarAtualizacaoStatus(body)).toMatchObject({ erro: { status: 400, codigo: 'DADOS_INVALIDOS' } })
    }
  })

  it('recusado com motivo: faz trim; vazio vira null', () => {
    expect(validarAtualizacaoStatus({ status: 'recusado', motivo: '  Agenda cheia  ' })).toEqual({
      dados: { status: 'recusado', motivo: 'Agenda cheia' },
    })
    expect(validarAtualizacaoStatus({ status: 'recusado', motivo: '   ' })).toEqual({
      dados: { status: 'recusado', motivo: null },
    })
  })

  it('motivo com 200 caracteres passa; com 201 não', () => {
    expect(validarAtualizacaoStatus({ status: 'recusado', motivo: 'a'.repeat(200) })).toHaveProperty('dados')
    expect(validarAtualizacaoStatus({ status: 'recusado', motivo: `  ${'a'.repeat(200)}  ` })).toHaveProperty('dados')
    expect(validarAtualizacaoStatus({ status: 'recusado', motivo: 'a'.repeat(201) })).toMatchObject({
      erro: { status: 400, codigo: 'DADOS_INVALIDOS' },
    })
  })

  it('motivo em status diferente de recusado ou que não é texto → 400', () => {
    expect(validarAtualizacaoStatus({ status: 'aceito', motivo: 'x' })).toMatchObject({ erro: { status: 400 } })
    expect(validarAtualizacaoStatus({ status: 'recusado', motivo: 123 })).toMatchObject({ erro: { status: 400 } })
  })
})
