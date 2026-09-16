import { describe, expect, it } from 'vitest'
import { getPedidos, updatePedidoStatus } from '../pages/painel-pedidos/service/pedidos.service.js'

describe('pedidos.service', () => {
  it('getPedidos busca os pedidos do json-server de teste', async () => {
    const pedidos = await getPedidos()

    expect(pedidos).toHaveLength(2)
    expect(pedidos[0]).toMatchObject({
      id: '1',
      veiculo: { modelo: 'Fiat Argo', placa: 'ABC1D23' },
      status: 'pendente',
    })
  })

  it('updatePedidoStatus atualiza o status do pedido no json-server de teste', async () => {
    const pedidoAtualizado = await updatePedidoStatus('2', 'concluido')

    expect(pedidoAtualizado.status).toBe('concluido')

    const pedidos = await getPedidos()
    const pedido2 = pedidos.find((pedido) => pedido.id === '2')
    expect(pedido2.status).toBe('concluido')
  })
})
