import { apiFetch } from '@/services/httpClient'
import { PEDIDOS_ROUTES } from './pedidos.routes'
import { normalizePedido, normalizePedidoCliente, type NovoPedidoPayload, type Pedido, type PedidoCliente } from './pedidos.model'

// Criação do pedido (I13), sobre o `apiFetch` (token do cliente + Response cru).
// Falha de rede já chega como `ErroRede`; 401 já derruba a sessão no httpClient.

export { ErroRede } from '@/services/httpClient'

/**
 * O backend recusou o pedido (400/404) — `codigo` estável
 * (`SERVICO_INVALIDO`, `HORARIO_PASSADO`, `VEICULO_NAO_ENCONTRADO`…; o I20
 * acrescenta `HORARIO_INDISPONIVEL`) e a mensagem pronta para a tela.
 */
export class PedidoRecusadoError extends Error {
  constructor(
    message: string,
    readonly codigo: string | null,
    readonly status: number,
  ) {
    super(message)
    this.name = 'PedidoRecusadoError'
  }
}

const MENSAGENS: Record<string, string> = {
  SERVICO_INVALIDO: 'Algum serviço escolhido não está mais disponível. Volte e escolha de novo.',
  HORARIO_PASSADO: 'Esse horário já passou. Escolha outra data e hora.',
  VEICULO_NAO_ENCONTRADO: 'Não encontramos esse veículo. Escolha outro.',
  LAVA_RAPIDO_NAO_ENCONTRADO: 'Esse lava-rápido não está mais disponível.',
}

export async function criarPedido(payload: NovoPedidoPayload): Promise<Pedido> {
  const response = await apiFetch(PEDIDOS_ROUTES.create, { method: 'POST', body: JSON.stringify(payload) })
  if (response.status === 201) return normalizePedido(await response.json())

  if (response.status === 400 || response.status === 404) {
    const corpo = await response.json().catch(() => ({}))
    const codigo = typeof corpo?.codigo === 'string' ? corpo.codigo : null
    const mensagem = (codigo && MENSAGENS[codigo]) || (typeof corpo?.error === 'string' && corpo.error) || 'O pedido não foi aceito. Confira os dados.'
    throw new PedidoRecusadoError(mensagem, codigo, response.status)
  }
  if (response.status === 401) throw new Error('Sua sessão expirou. Entre de novo para confirmar o pedido.')
  throw new Error('Não foi possível enviar o pedido agora. Tente de novo.')
}

// --- Pedidos do cliente (I18) ---
// Sempre buscam no backend (sem cache): o status mostrado é o do servidor.
// 401 já derruba a sessão no httpClient (handler do I2); aqui só vira erro.

/** O pedido não existe ou é de outro cliente (404). */
export class PedidoNaoEncontradoError extends Error {
  constructor() {
    super('Pedido não encontrado.')
    this.name = 'PedidoNaoEncontradoError'
  }
}

function erroDeLeitura(status: number): Error {
  if (status === 401) return new Error('Sua sessão expirou. Entre de novo para ver seus pedidos.')
  return new Error('Não foi possível carregar seus pedidos agora. Tente de novo.')
}

export async function listarMeusPedidos(): Promise<PedidoCliente[]> {
  const response = await apiFetch(PEDIDOS_ROUTES.meus)
  if (!response.ok) throw erroDeLeitura(response.status)
  const corpo = await response.json()
  return (Array.isArray(corpo) ? corpo : []).map(normalizePedidoCliente)
}

export async function buscarMeuPedido(id: string): Promise<PedidoCliente> {
  const response = await apiFetch(PEDIDOS_ROUTES.meu(id))
  if (response.status === 404) throw new PedidoNaoEncontradoError()
  if (!response.ok) throw erroDeLeitura(response.status)
  return normalizePedidoCliente(await response.json())
}

/** Marca a recusa como vista (POST .../visto, 204). */
export async function marcarRecusaVista(id: string): Promise<void> {
  const response = await apiFetch(PEDIDOS_ROUTES.marcarVisto(id), { method: 'POST' })
  if (response.status === 404) throw new PedidoNaoEncontradoError()
  if (!response.ok) throw erroDeLeitura(response.status)
}

/** Quantas recusas o cliente ainda não viu (GET /clientes/me/notificacoes). */
export async function contarRecusasNaoVistas(): Promise<number> {
  const response = await apiFetch(PEDIDOS_ROUTES.notificacoes)
  if (!response.ok) throw erroDeLeitura(response.status)
  const corpo = await response.json()
  const total = Number(corpo?.recusasNaoVistas)
  return Number.isFinite(total) && total > 0 ? Math.floor(total) : 0
}
