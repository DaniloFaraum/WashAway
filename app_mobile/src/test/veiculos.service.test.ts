import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  atualizarVeiculo,
  criarVeiculo,
  ErroRede,
  ErroValidacaoVeiculo,
  listarVeiculos,
  PlacaJaCadastradaError,
  removerVeiculo,
  VeiculoComPedidosError,
  VeiculoNaoEncontradoError,
} from '../features/veiculos/service/veiculos.service'

const dados = { marca: 'Chevrolet', modelo: 'Onix', cor: 'Prata', placa: 'ABC-1234' }

function resposta(status: number, corpo: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as Response
}

describe('veiculos.service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('listarVeiculos: GET /clientes/me/veiculos e normaliza (marca ausente vira null)', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      resposta(200, [
        { id: 'v1', clienteId: 'c1', marca: 'Chevrolet', modelo: 'Onix', cor: 'Prata', placa: 'ABC1234', criadoEm: 'x' },
        { id: 'v2', clienteId: 'c1', marca: null, modelo: 'Fit', cor: 'Preto', placa: 'ABC1D23', criadoEm: 'x' },
      ]),
    )

    expect(await listarVeiculos()).toEqual([
      { id: 'v1', marca: 'Chevrolet', modelo: 'Onix', cor: 'Prata', placa: 'ABC1234' },
      { id: 'v2', marca: null, modelo: 'Fit', cor: 'Preto', placa: 'ABC1D23' },
    ])
    expect(fetchMock.mock.calls[0][0]).toEqual(expect.stringContaining('/clientes/me/veiculos'))
  })

  it('listarVeiculos: erro do servidor vira mensagem pronta', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(500))

    await expect(listarVeiculos()).rejects.toThrow('Não foi possível carregar seus veículos')
  })

  it('criarVeiculo: 201 faz POST com o corpo e devolve o veículo', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(resposta(201, { id: 'v1', ...dados, placa: 'ABC1234' }))

    expect(await criarVeiculo(dados)).toMatchObject({ id: 'v1', placa: 'ABC1234' })
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(dados) })
  })

  it('criarVeiculo: 409 vira PlacaJaCadastradaError ("Você já cadastrou esse veículo")', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(409, { error: 'x' }))

    const erro = await criarVeiculo(dados).catch((e) => e)

    expect(erro).toBeInstanceOf(PlacaJaCadastradaError)
    expect(erro.message).toBe('Você já cadastrou esse veículo')
  })

  it('criarVeiculo: 400 vira ErroValidacaoVeiculo com os campos do back-end', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(400, { error: 'x', campos: { placa: 'Placa inválida' } }))

    const erro = await criarVeiculo(dados).catch((e) => e)

    expect(erro).toBeInstanceOf(ErroValidacaoVeiculo)
    expect(erro.campos).toEqual({ placa: 'Placa inválida' })
  })

  it('atualizarVeiculo: PUT no id; 404 vira VeiculoNaoEncontradoError', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(resposta(404, { error: 'Veículo não encontrado' }))

    await expect(atualizarVeiculo('v9', dados)).rejects.toBeInstanceOf(VeiculoNaoEncontradoError)
    expect(fetchMock.mock.calls[0][0]).toEqual(expect.stringContaining('/clientes/me/veiculos/v9'))
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT' })
  })

  it('removerVeiculo: 204 resolve; 404 vira VeiculoNaoEncontradoError', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(resposta(204)).mockResolvedValueOnce(resposta(404))

    await expect(removerVeiculo('v1')).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
    await expect(removerVeiculo('v1')).rejects.toBeInstanceOf(VeiculoNaoEncontradoError)
  })

  it('removerVeiculo: 409 (veículo com pedidos, I13) vira VeiculoComPedidosError', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(resposta(409, { error: 'x' }))

    await expect(removerVeiculo('v1')).rejects.toBeInstanceOf(VeiculoComPedidosError)
  })

  it('falha de rede vira ErroRede', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network request failed'))

    await expect(listarVeiculos()).rejects.toBeInstanceOf(ErroRede)
  })
})
