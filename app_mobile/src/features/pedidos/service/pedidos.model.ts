// Pedido como o backend devolve (I13). Ver backend: POST /pedidos.

export type StatusPedido = 'pendente' | 'em_andamento' | 'concluido'

export interface ServicoComprado {
  id: string
  servicoId: string | null
  /** Nome e preço do momento da compra. */
  nome: string
  preco: number
  duracaoMinutos: number
}

export interface Pedido {
  id: string
  lavaRapidoId: string
  status: StatusPedido
  /** ISO (UTC) do início do atendimento. */
  horario: string
  precoTotal: number
  duracaoMinutos: number
  veiculo: { id: string; marca: string | null; modelo: string; cor: string; placa: string } | null
  servicos: ServicoComprado[]
}

/** Corpo do POST /pedidos: só ids e o horário. Preço/duração NUNCA vão (o backend calcula). */
export interface NovoPedidoPayload {
  lavaRapidoId: string
  veiculoId: string
  servicoIds: string[]
  horario: string
}

export function montarPayloadPedido(dados: {
  lavaRapidoId: string
  veiculoId: string
  servicos: { id: string }[]
  horario: string
}): NovoPedidoPayload {
  return {
    lavaRapidoId: dados.lavaRapidoId,
    veiculoId: dados.veiculoId,
    servicoIds: dados.servicos.map((servico) => servico.id),
    horario: dados.horario,
  }
}

export function normalizePedido(raw: any): Pedido {
  const veiculo = raw?.veiculo
  return {
    id: String(raw?.id ?? ''),
    lavaRapidoId: String(raw?.lavaRapidoId ?? ''),
    status: (raw?.status ?? 'pendente') as StatusPedido,
    horario: String(raw?.horario ?? ''),
    precoTotal: Number(raw?.precoTotal) || 0,
    duracaoMinutos: Number(raw?.duracaoMinutos) || 0,
    veiculo: veiculo
      ? {
          id: String(veiculo.id),
          marca: veiculo.marca ?? null,
          modelo: String(veiculo.modelo ?? ''),
          cor: String(veiculo.cor ?? ''),
          placa: String(veiculo.placa ?? ''),
        }
      : null,
    servicos: (Array.isArray(raw?.servicos) ? raw.servicos : []).map((item: any) => ({
      id: String(item.id),
      servicoId: item.servicoId == null ? null : String(item.servicoId),
      nome: String(item.nome ?? ''),
      preco: Number(item.preco) || 0,
      duracaoMinutos: Number(item.duracaoMinutos) || 0,
    })),
  }
}
