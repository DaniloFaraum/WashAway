import { PedidoStatus } from '@prisma/client'

// Máquina de estados do pedido (I15) e validação do `PATCH /pedidos/:id`.
// Lógica pura, sem banco.
// pendente → aceito | recusado; aceito → em_andamento → concluido.
// recusado e concluido são finais.

export const TRANSICOES: Record<PedidoStatus, readonly PedidoStatus[]> = {
  pendente: ['aceito', 'recusado'],
  aceito: ['em_andamento'],
  em_andamento: ['concluido'],
  recusado: [],
  concluido: [],
}

export const MOTIVO_RECUSA_MAX = 200

const ROTULOS: Record<PedidoStatus, string> = {
  pendente: 'pendente',
  aceito: 'aceito',
  recusado: 'recusado',
  em_andamento: 'em andamento',
  concluido: 'concluído',
}

export function podeTransicionar(de: PedidoStatus, para: PedidoStatus): boolean {
  return TRANSICOES[de].includes(para)
}

/** Ex.: "Não é possível mudar de recusado para aceito." */
export function mensagemTransicaoInvalida(de: PedidoStatus, para: PedidoStatus): string {
  if (de === para) return `O pedido já está ${ROTULOS[de]}.`
  return `Não é possível mudar de ${ROTULOS[de]} para ${ROTULOS[para]}.`
}

/** Recusas do `PATCH /pedidos/:id` (corpo `{ error, codigo }`, mesmo formato do `POST`). */
export interface ErroStatusPedido {
  status: 400 | 404 | 409
  error: string
  codigo: 'DADOS_INVALIDOS' | 'PEDIDO_NAO_ENCONTRADO' | 'TRANSICAO_INVALIDA'
}

export interface DadosAtualizacaoStatus {
  status: PedidoStatus
  /** Só em `recusado`; `null` quando não informado (ou vazio após `trim`). */
  motivo: string | null
}

function invalido(error: string): { erro: ErroStatusPedido } {
  return { erro: { status: 400, error, codigo: 'DADOS_INVALIDOS' } }
}

/**
 * Body do `PATCH /pedidos/:id`: `{ status, motivo? }`. `motivo` só com
 * `status: 'recusado'`, texto de até 200 caracteres após `trim`. Outros campos
 * do body são ignorados.
 */
export function validarAtualizacaoStatus(body: unknown): { erro: ErroStatusPedido } | { dados: DadosAtualizacaoStatus } {
  const { status, motivo } = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

  if (typeof status !== 'string' || !(Object.values(PedidoStatus) as string[]).includes(status)) {
    return invalido('status inválido')
  }

  if (motivo === undefined || motivo === null) {
    return { dados: { status: status as PedidoStatus, motivo: null } }
  }
  if (status !== PedidoStatus.recusado) {
    return invalido('O motivo só pode ser informado ao recusar o pedido.')
  }
  if (typeof motivo !== 'string') {
    return invalido('motivo deve ser um texto.')
  }
  const texto = motivo.trim()
  if (texto.length > MOTIVO_RECUSA_MAX) {
    return invalido(`O motivo pode ter no máximo ${MOTIVO_RECUSA_MAX} caracteres.`)
  }
  return { dados: { status: PedidoStatus.recusado, motivo: texto || null } }
}
