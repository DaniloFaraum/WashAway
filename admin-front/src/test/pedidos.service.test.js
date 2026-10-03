import { afterEach, describe, expect, it } from 'vitest'
import { getPedidos, updatePedidoStatus } from '../pages/painel-pedidos/service/pedidos.service.js'
import { limparSessao, setEmpresaLogadaId } from '../login/sessao.storage.js'

describe('pedidos.service', () => {
  afterEach(() => {
    limparSessao()
  })

  it('getPedidos busca os pedidos do json-server de teste', async () => {
    const pedidos = await getPedidos()

    expect(pedidos).toHaveLength(2)
    expect(pedidos[0]).toMatchObject({
      id: '1',
      veiculo: { modelo: 'Fiat Argo', placa: 'ABC1D23' },
      status: 'pendente',
    })
  })

  it('getPedidos filtra pelo lavaRapidoId da sessão quando há uma empresa logada', async () => {
    setEmpresaLogadaId('lr-1')

    const pedidos = await getPedidos()

    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]).toMatchObject({ id: '1' })
  })

  it('updatePedidoStatus atualiza o status do pedido no json-server de teste', async () => {
    const pedidoAtualizado = await updatePedidoStatus('2', 'concluido')

    expect(pedidoAtualizado.status).toBe('concluido')

    const pedidos = await getPedidos()
    const pedido2 = pedidos.find((pedido) => pedido.id === '2')
    expect(pedido2.status).toBe('concluido')
  })
})
