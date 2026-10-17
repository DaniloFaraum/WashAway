import { describe, expect, it } from 'vitest'
import { separarPedidos } from '../features/pedidos/separarPedidos'
import type { PedidoCliente } from '../features/pedidos/service/pedidos.model'

function pedido(overrides: Partial<PedidoCliente>): PedidoCliente {
  return {
    id: 'p',
    status: 'pendente',
    horario: '2026-10-20T13:00:00.000Z',
    precoTotal: 50,
    duracaoMinutos: 30,
    veiculo: null,
    servicos: [],
    lavaRapido: { id: 'lr1', nome: 'Lava', endereco: null },
    quando: 'proximo',
    statusAlteradoEm: null,
    motivoRecusa: null,
    recusaVistaEm: null,
    ...overrides,
  }
}

describe('separarPedidos (I18)', () => {
  it('lista vazia: três listas vazias', () => {
    expect(separarPedidos([])).toEqual({ proximos: [], anteriores: [], recusados: [] })
  })

  it('usa o `quando` do backend e tira os recusados para a lista própria', () => {
    const { proximos, anteriores, recusados } = separarPedidos([
      pedido({ id: 'proximo', quando: 'proximo', status: 'aceito' }),
      pedido({ id: 'anterior', quando: 'anterior', status: 'concluido' }),
      pedido({ id: 'recusadoFuturo', quando: 'anterior', status: 'recusado' }),
      // Mesmo se viesse como "proximo", recusado fica só em Recusados.
      pedido({ id: 'recusadoProximo', quando: 'proximo', status: 'recusado' }),
    ])
    expect(proximos.map((p) => p.id)).toEqual(['proximo'])
    expect(anteriores.map((p) => p.id)).toEqual(['anterior'])
    expect(recusados.map((p) => p.id).sort()).toEqual(['recusadoFuturo', 'recusadoProximo'])
  })

  it('próximos em ordem crescente e anteriores em ordem decrescente de horário', () => {
    const { proximos, anteriores } = separarPedidos([
      pedido({ id: 'p3', horario: '2026-10-25T13:00:00.000Z' }),
      pedido({ id: 'p1', horario: '2026-10-18T13:00:00.000Z' }),
      pedido({ id: 'p2', horario: '2026-10-20T13:00:00.000Z' }),
      pedido({ id: 'a1', quando: 'anterior', horario: '2026-10-01T13:00:00.000Z' }),
      pedido({ id: 'a3', quando: 'anterior', horario: '2026-10-15T13:00:00.000Z' }),
      pedido({ id: 'a2', quando: 'anterior', horario: '2026-10-10T13:00:00.000Z' }),
    ])
    expect(proximos.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
    expect(anteriores.map((p) => p.id)).toEqual(['a3', 'a2', 'a1'])
  })

  it('recusados pela data da recusa, mais recente primeiro (sem data, usa o horário)', () => {
    const { recusados } = separarPedidos([
      pedido({ id: 'antiga', status: 'recusado', horario: '2026-11-30T13:00:00.000Z', statusAlteradoEm: '2026-10-01T10:00:00.000Z' }),
      pedido({ id: 'recente', status: 'recusado', horario: '2026-10-05T13:00:00.000Z', statusAlteradoEm: '2026-10-16T10:00:00.000Z' }),
      pedido({ id: 'semData', status: 'recusado', horario: '2026-10-10T13:00:00.000Z', statusAlteradoEm: null }),
    ])
    expect(recusados.map((p) => p.id)).toEqual(['recente', 'semData', 'antiga'])
  })

  it('não altera a lista recebida', () => {
    const lista = [pedido({ id: 'b', horario: '2026-10-25T13:00:00.000Z' }), pedido({ id: 'a', horario: '2026-10-18T13:00:00.000Z' })]
    separarPedidos(lista)
    expect(lista.map((p) => p.id)).toEqual(['b', 'a'])
  })
})
