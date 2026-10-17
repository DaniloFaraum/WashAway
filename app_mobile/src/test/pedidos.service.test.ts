import { afterEach, describe, expect, it, vi } from 'vitest'
import { montarPayloadPedido, normalizePedido } from '../features/pedidos/service/pedidos.model'
import { criarPedido, ErroRede, PedidoRecusadoError } from '../features/pedidos/service/pedidos.service'

function resposta(status: number, corpo: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as Response
}

const PAYLOAD = { lavaRapidoId: 'lr1', veiculoId: 'v1', servicoIds: ['s1', 's2'], horario: '2026-10-22T10:00:00-03:00' }

describe('pedidos (app)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('montarPayloadPedido manda só ids e horário — nunca preço ou duração', () => {
    const payload = montarPayloadPedido({
      lavaRapidoId: 'lr1',
      veiculoId: 'v1',
      servicos: [
        { id: 's1', nome: 'A', preco: 10, duracaoMinutos: 30 } as { id: string },
        { id: 's2', nome: 'B', preco: 20, duracaoMinutos: 15 } as { id: string },
      ],
      horario: '2026-10-22T10:00:00-03:00',
    })
    expect(payload).toEqual(PAYLOAD)
    expect(JSON.stringify(payload)).not.toMatch(/preco|duracao/)
  })

  it('criarPedido: POST /pedidos com o payload e devolve o pedido normalizado', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      resposta(201, {
        id: 'p1',
        lavaRapidoId: 'lr1',
        status: 'pendente',
        horario: '2026-10-22T13:00:00.000Z',
        precoTotal: 30,
        duracaoMinutos: 45,
        veiculo: { id: 'v1', marca: null, modelo: 'Argo', cor: 'Branco', placa: 'ABC1D23' },
        servicos: [{ id: 'ps1', servicoId: 's1', nome: 'A', preco: 10, duracaoMinutos: 30 }],
      }),
    )

    const pedido = await criarPedido(PAYLOAD)

    expect(pedido).toMatchObject({ id: 'p1', status: 'pendente', precoTotal: 30, servicos: [{ nome: 'A', preco: 10 }] })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toEqual(expect.stringContaining('/pedidos'))
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String((init as RequestInit).body))).toEqual(PAYLOAD)
  })

  it.each([
    [400, 'SERVICO_INVALIDO', 'Algum serviço escolhido não está mais disponível'],
    [400, 'HORARIO_PASSADO', 'Esse horário já passou'],
    [404, 'VEICULO_NAO_ENCONTRADO', 'Não encontramos esse veículo'],
  ])('criarPedido: %i %s vira PedidoRecusadoError com mensagem clara', async (status, codigo, mensagem) => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(status, { error: 'x', codigo }))

    const erro = await criarPedido(PAYLOAD).catch((e) => e)
    expect(erro).toBeInstanceOf(PedidoRecusadoError)
    expect(erro).toMatchObject({ codigo, status })
    expect(erro.message).toContain(mensagem)
  })

  it('criarPedido: código desconhecido (ex.: do I20) usa a mensagem do backend', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      resposta(400, { error: 'Nesse dia o lava-rápido fecha às 18:00.', codigo: 'HORARIO_INDISPONIVEL' }),
    )

    await expect(criarPedido(PAYLOAD)).rejects.toMatchObject({
      message: 'Nesse dia o lava-rápido fecha às 18:00.',
      codigo: 'HORARIO_INDISPONIVEL',
    })
  })

  it('criarPedido: falha de rede vira ErroRede; 500 vira mensagem pronta', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('Network request failed'))
    await expect(criarPedido(PAYLOAD)).rejects.toBeInstanceOf(ErroRede)

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(resposta(500))
    await expect(criarPedido(PAYLOAD)).rejects.toThrow('Não foi possível enviar o pedido agora')
  })

  it('normalizePedido aguenta campos ausentes', () => {
    expect(normalizePedido({ id: 1 })).toEqual({
      id: '1',
      lavaRapidoId: '',
      status: 'pendente',
      horario: '',
      precoTotal: 0,
      duracaoMinutos: 0,
      veiculo: null,
      servicos: [],
    })
  })
})
