// Pedido como o backend devolve (I13). Ver backend: POST /pedidos.

// I15: `aceito` e `recusado` (a resposta do lava-rápido).
export type StatusPedido = 'pendente' | 'aceito' | 'recusado' | 'em_andamento' | 'concluido'

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

// --- Pedidos do cliente (I18): GET /clientes/me/pedidos ---

/** Em qual lista o backend põe o pedido (regra de tempo é do backend: `classificarPedido`). */
export type QuandoPedido = 'proximo' | 'anterior'

export interface PedidoCliente extends Omit<Pedido, 'lavaRapidoId'> {
  lavaRapido: { id: string; nome: string; endereco: string | null }
  quando: QuandoPedido
  /** ISO da última mudança de status (I15); `null` se nunca mudou. */
  statusAlteradoEm: string | null
  motivoRecusa: string | null
  /** ISO de quando o cliente viu a recusa; `null` = ainda não viu. */
  recusaVistaEm: string | null
}

const textoOuNull = (valor: unknown) => (typeof valor === 'string' && valor !== '' ? valor : null)

export function normalizePedidoCliente(raw: any): PedidoCliente {
  const { lavaRapidoId: _lavaRapidoId, ...base } = normalizePedido(raw)
  const lavaRapido = raw?.lavaRapido
  return {
    ...base,
    lavaRapido: {
      id: String(lavaRapido?.id ?? raw?.lavaRapidoId ?? ''),
      nome: String(lavaRapido?.nome ?? ''),
      endereco: textoOuNull(lavaRapido?.endereco),
    },
    quando: raw?.quando === 'proximo' ? 'proximo' : 'anterior',
    statusAlteradoEm: textoOuNull(raw?.statusAlteradoEm),
    motivoRecusa: textoOuNull(raw?.motivoRecusa),
    recusaVistaEm: textoOuNull(raw?.recusaVistaEm),
  }
}
