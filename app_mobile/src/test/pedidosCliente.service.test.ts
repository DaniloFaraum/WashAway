import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizePedidoCliente } from '../features/pedidos/service/pedidos.model'
import {
  buscarMeuPedido,
  contarRecusasNaoVistas,
  listarMeusPedidos,
  marcarRecusaVista,
  PedidoNaoEncontradoError,
} from '../features/pedidos/service/pedidos.service'
import { atualizarRecusasNaoVistas, getRecusasNaoVistas, limparRecusasNaoVistas } from '../features/pedidos/recusasNaoVistas'
import { definirTokenDaSessao, registrarAoExpirarSessao } from '../services/httpClient'

function resposta(status: number, corpo: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as Response
}

const PEDIDO_API = {
  id: 'p1',
  status: 'recusado',
  horario: '2026-11-06T17:00:00.000Z',
  precoTotal: 350,
  duracaoMinutos: 120,
  criadoEm: '2026-10-15T12:00:00.000Z',
  statusAlteradoEm: '2026-10-16T22:30:00.000Z',
  motivoRecusa: 'Agenda cheia',
  recusaVistaEm: null,
  quando: 'anterior',
  lavaRapido: { id: 'lr1', nome: 'Lava Jato Vila Madalena', endereco: 'Rua Harmonia, 455' },
  veiculo: { id: 'v1', marca: 'Honda', modelo: 'Fit', cor: 'Preto', placa: 'FGH4521' },
  servicos: [{ id: 'ps1', servicoId: 's1', nome: 'Polimento técnico', preco: 350, duracaoMinutos: 120 }],
}

describe('pedidos do cliente (app, I18)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    definirTokenDaSessao(null)
    limparRecusasNaoVistas()
  })

  it('normalizePedidoCliente: lava-rápido, quando, recusa e serviços', () => {
    expect(normalizePedidoCliente(PEDIDO_API)).toMatchObject({
      id: 'p1',
      status: 'recusado',
      quando: 'anterior',
      motivoRecusa: 'Agenda cheia',
      statusAlteradoEm: '2026-10-16T22:30:00.000Z',
      recusaVistaEm: null,
      lavaRapido: { id: 'lr1', nome: 'Lava Jato Vila Madalena', endereco: 'Rua Harmonia, 455' },
      veiculo: { placa: 'FGH4521' },
      servicos: [{ nome: 'Polimento técnico', preco: 350 }],
    })
  })

  it('normalizePedidoCliente: campos ausentes viram valores seguros', () => {
    expect(normalizePedidoCliente({ id: 'p2' })).toMatchObject({
      quando: 'anterior',
      motivoRecusa: null,
      recusaVistaEm: null,
      lavaRapido: { nome: '', endereco: null },
      servicos: [],
    })
  })

  it('listarMeusPedidos: GET /clientes/me/pedidos com o token da sessão', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(resposta(200, [PEDIDO_API]))
    definirTokenDaSessao('tok-cliente')

    const pedidos = await listarMeusPedidos()

    expect(pedidos).toHaveLength(1)
    expect(pedidos[0].lavaRapido.nome).toBe('Lava Jato Vila Madalena')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toEqual(expect.stringMatching(/\/clientes\/me\/pedidos$/))
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok-cliente')
  })

  it('buscarMeuPedido: GET /clientes/me/pedidos/:id; 404 vira PedidoNaoEncontradoError', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(resposta(200, PEDIDO_API)).mockResolvedValueOnce(resposta(404))

    expect((await buscarMeuPedido('p1')).id).toBe('p1')
    expect(fetchMock.mock.calls[0][0]).toEqual(expect.stringMatching(/\/clientes\/me\/pedidos\/p1$/))
    await expect(buscarMeuPedido('de-outro')).rejects.toBeInstanceOf(PedidoNaoEncontradoError)
  })

  it('marcarRecusaVista: POST /clientes/me/pedidos/:id/visto', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(resposta(204))

    await marcarRecusaVista('p1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toEqual(expect.stringMatching(/\/clientes\/me\/pedidos\/p1\/visto$/))
    expect(init).toMatchObject({ method: 'POST' })
  })

  it('contarRecusasNaoVistas: GET /clientes/me/notificacoes; valor inválido vira 0', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(resposta(200, { recusasNaoVistas: 3 }))
      .mockResolvedValueOnce(resposta(200, {}))

    expect(await contarRecusasNaoVistas()).toBe(3)
    expect(fetchMock.mock.calls[0][0]).toEqual(expect.stringMatching(/\/clientes\/me\/notificacoes$/))
    expect(await contarRecusasNaoVistas()).toBe(0)
  })

  it('401 com token aciona o handler de sessão expirada (I2) e vira erro', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(401))
    const handler = vi.fn()
    const desfazer = registrarAoExpirarSessao(handler)
    definirTokenDaSessao('tok-expirado')

    await expect(listarMeusPedidos()).rejects.toThrow('Sua sessão expirou')
    expect(handler).toHaveBeenCalledTimes(1)
    desfazer()
  })

  it('500: mensagem genérica para tentar de novo', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(500))
    await expect(listarMeusPedidos()).rejects.toThrow('Tente de novo')
  })

  it('contador do badge: atualiza com o backend e mantém o último valor se a busca falhar', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(resposta(200, { recusasNaoVistas: 2 }))
      .mockResolvedValueOnce(resposta(500))
      .mockResolvedValueOnce(resposta(200, { recusasNaoVistas: 0 }))

    expect(await atualizarRecusasNaoVistas()).toBe(2)
    expect(await atualizarRecusasNaoVistas()).toBe(2)
    expect(getRecusasNaoVistas()).toBe(2)
    expect(await atualizarRecusasNaoVistas()).toBe(0)
  })
})
