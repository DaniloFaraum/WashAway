import { colors } from '@/constants/colors'
import type { StatusPedido } from './service/pedidos.model'

// I18: rótulo e cor do selo de status do pedido no app (inclui `aceito` e
// `recusado` do I15). Status desconhecido cai num selo neutro.

export interface EstiloStatus {
  rotulo: string
  /** Cor do texto e da borda do selo. */
  cor: string
  /** Fundo claro do selo. */
  fundo: string
}

export const STATUS_PEDIDO: Record<StatusPedido, EstiloStatus> = {
  pendente: { rotulo: 'Aguardando confirmação', cor: '#B45309', fundo: '#FEF3C7' },
  aceito: { rotulo: 'Confirmado', cor: colors.primary, fundo: '#E0EFFD' },
  recusado: { rotulo: 'Recusado', cor: colors.danger, fundo: '#FEF2F2' },
  em_andamento: { rotulo: 'Em andamento', cor: '#6D28D9', fundo: '#EDE9FE' },
  concluido: { rotulo: 'Concluído', cor: colors.success, fundo: '#E7F6EE' },
}

const DESCONHECIDO: EstiloStatus = { rotulo: 'Status desconhecido', cor: colors.neutralGray, fundo: colors.border }

export function estiloDoStatus(status: string): EstiloStatus {
  return (STATUS_PEDIDO as Record<string, EstiloStatus>)[status] ?? DESCONHECIDO
}
