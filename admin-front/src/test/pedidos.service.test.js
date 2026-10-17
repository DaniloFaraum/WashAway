import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPedidos, updatePedidoStatus } from '../pages/painel-pedidos/service/pedidos.service.js'
import {
  PROXIMOS_STATUS,
  descreverVeiculo,
  formatarPreco,
  normalizePedido,
  separarPendentes,
} from '../pages/painel-pedidos/service/pedidos.model.js'
import { limparSessao, setEmpresaLogadaId } from '../login/sessao.storage.js'

describe('pedidos.service', () => {
  afterEach(() => {
    limparSessao()
  })

  it('getPedidos busca os pedidos do json-server de teste', async () => {
    const pedidos = await getPedidos()

    expect(pedidos).toHaveLength(4)
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

  it('getPedidos traz aceito e recusado com statusAlteradoEm e motivo (I15)', async () => {
    const pedidos = await getPedidos()

    expect(pedidos.find((pedido) => pedido.id === '3')).toMatchObject({
      status: 'aceito',
      statusAlteradoEm: '2026-09-16T12:00:00.000Z',
      motivoRecusa: null,
    })
    expect(pedidos.find((pedido) => pedido.id === '4')).toMatchObject({
      status: 'recusado',
      motivoRecusa: 'Agenda de polimento cheia nesse dia.',
    })
  })

  it('normalizePedido: sem statusAlteradoEm/motivoRecusa vira null (pedido antigo)', () => {
    expect(normalizePedido({ id: 1, status: 'concluido' })).toMatchObject({ statusAlteradoEm: null, motivoRecusa: null })
    expect(normalizePedido({ id: 1, status: 'recusado', motivoRecusa: '' })).toMatchObject({ motivoRecusa: null })
  })

  it('PROXIMOS_STATUS segue o fluxo do backend (I15)', () => {
    const proximos = Object.fromEntries(
      Object.entries(PROXIMOS_STATUS).map(([de, acoes]) => [de, acoes.map((acao) => acao.status)]),
    )
    expect(proximos).toEqual({
      pendente: ['aceito', 'recusado'],
      aceito: ['em_andamento'],
      em_andamento: ['concluido'],
      recusado: [],
      concluido: [],
    })
    expect(PROXIMOS_STATUS.pendente.map((acao) => acao.label)).toEqual(['Aceitar', 'Recusar'])
  })

  it('separarPendentes: pendentes à parte, do horário mais próximo ao mais distante', () => {
    const pedidos = [
      { id: 'a', status: 'concluido', horario: '2026-09-15T10:00:00Z' },
      { id: 'b', status: 'pendente', horario: '2026-09-18T10:00:00Z' },
      { id: 'c', status: 'pendente', horario: '2026-09-17T10:00:00Z' },
      { id: 'd', status: 'aceito', horario: '2026-09-16T10:00:00Z' },
    ]
    const { pendentes, demais } = separarPendentes(pedidos)
    expect(pendentes.map((pedido) => pedido.id)).toEqual(['c', 'b'])
    expect(demais.map((pedido) => pedido.id)).toEqual(['a', 'd'])
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
    expect(pedidos).toHaveLength(4)
  })

  it('updatePedidoStatus atualiza o status do pedido no json-server de teste', async () => {
    const pedidoAtualizado = await updatePedidoStatus('2', 'concluido')

    expect(pedidoAtualizado.status).toBe('concluido')

    const pedidos = await getPedidos()
    const pedido2 = pedidos.find((pedido) => pedido.id === '2')
    expect(pedido2.status).toBe('concluido')
  })

  it('updatePedidoStatus envia o motivo ao recusar (com trim)', async () => {
    const corpos = []
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = vi.fn(async (url, options) => {
      if (options?.method === 'PATCH') corpos.push(JSON.parse(options.body))
      return fetchOriginal(url, options)
    })
    try {
      const recusado = await updatePedidoStatus('1', 'recusado', '  Agenda cheia  ')
      expect(recusado).toMatchObject({ status: 'recusado' })
      await updatePedidoStatus('1', 'recusado', '   ')
      await updatePedidoStatus('3', 'em_andamento', 'ignorado fora da recusa')
    } finally {
      globalThis.fetch = fetchOriginal
    }

    expect(corpos).toEqual([
      { status: 'recusado', motivo: 'Agenda cheia' },
      { status: 'recusado' },
      { status: 'em_andamento' },
    ])
  })

  it('erro do backend: o erro lançado traz status e a mensagem do backend', async () => {
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Não é possível mudar de recusado para aceito.', codigo: 'TRANSICAO_INVALIDA' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    try {
      await expect(updatePedidoStatus('4', 'aceito')).rejects.toMatchObject({
        status: 409,
        mensagemBackend: 'Não é possível mudar de recusado para aceito.',
      })
    } finally {
      globalThis.fetch = fetchOriginal
    }
  })
})
