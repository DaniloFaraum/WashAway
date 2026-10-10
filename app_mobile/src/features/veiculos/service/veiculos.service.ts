import { apiFetch } from '@/services/httpClient'
import { VEICULOS_ROUTES } from './veiculos.routes'
import { normalizeVeiculo, type DadosVeiculo, type ErrosVeiculo, type Veiculo } from './veiculos.model'

// Veículos do cliente logado (I3), sobre o `apiFetch` (token + Response cru).
// Falha de rede já chega como `ErroRede`; 401 já derruba a sessão no httpClient.

export { ErroRede } from '@/services/httpClient'

export class PlacaJaCadastradaError extends Error {
  constructor() {
    super('Você já cadastrou esse veículo')
    this.name = 'PlacaJaCadastradaError'
  }
}

export class ErroValidacaoVeiculo extends Error {
  constructor(readonly campos: ErrosVeiculo) {
    super('Confira os campos destacados')
    this.name = 'ErroValidacaoVeiculo'
  }
}

export class VeiculoNaoEncontradoError extends Error {
  constructor() {
    super('Veículo não encontrado. Ele pode ter sido removido.')
    this.name = 'VeiculoNaoEncontradoError'
  }
}

async function erroDaResposta(response: Response, padrao: string): Promise<Error> {
  if (response.status === 409) return new PlacaJaCadastradaError()
  if (response.status === 404) return new VeiculoNaoEncontradoError()
  if (response.status === 400) {
    const corpo = await response.json().catch(() => ({}))
    return new ErroValidacaoVeiculo(corpo?.campos ?? {})
  }
  return new Error(padrao)
}

export async function listarVeiculos(): Promise<Veiculo[]> {
  const response = await apiFetch(VEICULOS_ROUTES.list)
  if (!response.ok) throw new Error('Não foi possível carregar seus veículos. Tente de novo.')
  const data = await response.json()
  return Array.isArray(data) ? data.map(normalizeVeiculo) : []
}

export async function criarVeiculo(dados: DadosVeiculo): Promise<Veiculo> {
  const response = await apiFetch(VEICULOS_ROUTES.list, { method: 'POST', body: JSON.stringify(dados) })
  if (response.status === 201) return normalizeVeiculo(await response.json())
  throw await erroDaResposta(response, 'Não foi possível cadastrar o veículo agora. Tente de novo.')
}

export async function atualizarVeiculo(id: string, dados: DadosVeiculo): Promise<Veiculo> {
  const response = await apiFetch(VEICULOS_ROUTES.byId(id), { method: 'PUT', body: JSON.stringify(dados) })
  if (response.ok) return normalizeVeiculo(await response.json())
  throw await erroDaResposta(response, 'Não foi possível salvar o veículo agora. Tente de novo.')
}

export async function removerVeiculo(id: string): Promise<void> {
  const response = await apiFetch(VEICULOS_ROUTES.byId(id), { method: 'DELETE' })
  if (response.status === 204) return
  throw await erroDaResposta(response, 'Não foi possível remover o veículo agora. Tente de novo.')
}
