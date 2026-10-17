import { afterEach, describe, expect, it } from 'vitest'
import {
  escolherHorario,
  escolherVeiculo,
  getNovoPedido,
  iniciarNovoPedido,
  limparNovoPedido,
  totaisDoPedido,
} from '../features/pedidos/useNovoPedido'

const LAVA = { id: 'lr1', nome: 'Lava 1', endereco: 'Rua A' }
const SERVICOS = [
  { id: 's1', nome: 'Completa', preco: 40.1, duracaoMinutos: 35 },
  { id: 's2', nome: 'Cera', preco: 29.9, duracaoMinutos: 30 },
]
const VEICULO = { id: 'v1', marca: 'Fiat', modelo: 'Argo', cor: 'Branco', placa: 'ABC1D23' }

describe('estado do fluxo do pedido (useNovoPedido)', () => {
  afterEach(() => limparNovoPedido())

  it('guarda lava-rápido, serviços, veículo e horário entre os passos', () => {
    iniciarNovoPedido(LAVA, SERVICOS)
    escolherVeiculo(VEICULO)
    escolherHorario('2026-10-22T10:00:00-03:00')

    expect(getNovoPedido()).toEqual({ lavaRapido: LAVA, servicos: SERVICOS, veiculo: VEICULO, horario: '2026-10-22T10:00:00-03:00', erroHorario: null })
  })

  it('voltar para trocar serviços no mesmo lava-rápido mantém veículo e horário', () => {
    iniciarNovoPedido(LAVA, SERVICOS)
    escolherVeiculo(VEICULO)
    escolherHorario('2026-10-22T10:00:00-03:00')
    iniciarNovoPedido(LAVA, [SERVICOS[0]])

    expect(getNovoPedido()).toMatchObject({ servicos: [SERVICOS[0]], veiculo: VEICULO, horario: '2026-10-22T10:00:00-03:00' })
  })

  it('outro lava-rápido começa do zero; horário pré-preenchido (I9) entra quando não há escolha', () => {
    iniciarNovoPedido(LAVA, SERVICOS)
    escolherVeiculo(VEICULO)
    iniciarNovoPedido({ ...LAVA, id: 'lr2' }, SERVICOS, '2026-10-23T09:00:00-03:00')

    expect(getNovoPedido()).toMatchObject({ veiculo: null, horario: '2026-10-23T09:00:00-03:00' })
  })

  it('totais só para exibir: soma de preço (em centavos) e duração', () => {
    expect(totaisDoPedido(SERVICOS)).toEqual({ precoTotal: 70, duracaoMinutos: 65 })
  })
})
