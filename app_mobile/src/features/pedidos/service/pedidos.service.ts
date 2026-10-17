import { apiFetch } from '@/services/httpClient'
import { PEDIDOS_ROUTES } from './pedidos.routes'
import { normalizePedido, type NovoPedidoPayload, type Pedido } from './pedidos.model'

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
