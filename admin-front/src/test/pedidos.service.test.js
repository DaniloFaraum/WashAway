import { afterEach, describe, expect, it } from 'vitest'
import { getPedidos, updatePedidoStatus } from '../pages/painel-pedidos/service/pedidos.service.js'
import { descreverVeiculo, formatarPreco, normalizePedido } from '../pages/painel-pedidos/service/pedidos.model.js'
import { limparSessao, setEmpresaLogadaId } from '../login/sessao.storage.js'

describe('pedidos.service', () => {
  afterEach(() => {
    limparSessao()
  })

  it('getPedidos busca os pedidos do json-server de teste', async () => {
    const pedidos = await getPedidos()

    expect(pedidos).toHaveLength(2)
    // Formato novo (I13): cliente, veículo, serviços, total e duração
    expect(pedidos[0]).toMatchObject({
      id: '1',
      cliente: { nome: 'Ana Ribeiro' },
      veiculo: { marca: 'Fiat', modelo: 'Argo', cor: 'Branco', placa: 'ABC1D23' },
      servicos: [
        { nome: 'Lavagem completa', preco: 70 },
        { nome: 'Polimento', preco: 120 },
      ],
      precoTotal: 190,
      duracaoMinutos: 225,
      status: 'pendente',
    })
    // Formato antigo (veículo em JSON + serviço em texto) continua sendo lido
    expect(pedidos[1]).toMatchObject({
      id: '2',
      cliente: null,
      veiculo: { marca: null, modelo: 'VW Gol', placa: 'XYZ9E88' },
      servicos: [{ nome: 'Lavagem simples', preco: null }],
      precoTotal: null,
    })
  })

  it('normalizePedido e formatação: sem serviços vira lista vazia; preço nulo vira "—"', () => {
    expect(normalizePedido({ id: 9 })).toMatchObject({ id: '9', cliente: null, servicos: [], precoTotal: null })
    expect(formatarPreco(110.5)).toBe('R$ 110,50')
    expect(formatarPreco(null)).toBe('—')
    expect(descreverVeiculo({ marca: 'Fiat', modelo: 'Argo', placa: 'ABC1D23' })).toBe('Fiat Argo — ABC1D23')
    expect(descreverVeiculo({ marca: null, modelo: 'Gol', placa: '' })).toBe('Gol')
  })

  it('getPedidos não manda ?lavaRapidoId= mesmo com empresa logada (o backend filtra pelo token)', async () => {
    setEmpresaLogadaId('lr-1')

    const pedidos = await getPedidos()

    // json-server não conhece token: sem o filtro na URL, devolve todos.
    expect(pedidos).toHaveLength(2)
  })

  it('updatePedidoStatus atualiza o status do pedido no json-server de teste', async () => {
    const pedidoAtualizado = await updatePedidoStatus('2', 'concluido')

    expect(pedidoAtualizado.status).toBe('concluido')

    const pedidos = await getPedidos()
    const pedido2 = pedidos.find((pedido) => pedido.id === '2')
    expect(pedido2.status).toBe('concluido')
  })
})
