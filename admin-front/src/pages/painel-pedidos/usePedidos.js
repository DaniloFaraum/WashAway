import { getPedidos, updatePedidoStatus } from './service/pedidos.service.js'
import { useFetch } from '../../hooks/useFetch.js'
import { useToast } from '../../hooks/useToast.js'

/**
 * Encapsula a busca de pedidos, a atualização de status e o controle do
 * toast de feedback, deixando `PainelPedidos.jsx` só com a apresentação.
 *
 * @returns {{
 *   pedidos: import('./service/pedidos.model.js').Pedido[],
 *   loading: boolean,
 *   error: string | null,
 *   toast: { open: boolean, message: string, severity: 'success' | 'error' },
 *   handleStatusChange: (id: string, status: import('./service/pedidos.model.js').Pedido['status'], motivo?: string) => Promise<boolean>,
 *   handleCloseToast: () => void,
 * }}
 */
const MENSAGEM_SUCESSO = {
  aceito: 'Pedido aceito.',
  recusado: 'Pedido recusado.',
  em_andamento: 'Atendimento iniciado.',
  concluido: 'Pedido concluído.',
}

export function usePedidos() {
  const { data: pedidos, setData: setPedidos, loading, error } = useFetch(getPedidos)
  const { toast, showToast, closeToast } = useToast()

  /** Devolve `true` se mudou (para o diálogo de recusa fechar só no sucesso). */
  async function handleStatusChange(id, status, motivo) {
    try {
      const pedidoAtualizado = await updatePedidoStatus(id, status, motivo)
      setPedidos((atuais) =>
        atuais.map((pedido) => (pedido.id === id ? pedidoAtualizado : pedido)),
      )
      showToast(MENSAGEM_SUCESSO[status] ?? 'Status atualizado.')
      return true
    } catch (err) {
      // Ex.: 409 "Não é possível mudar de recusado para aceito." (I15).
      showToast(`Erro ao atualizar status: ${err.mensagemBackend ?? err.message}`, 'error')
      return false
    }
  }

  return { pedidos: pedidos ?? [], loading, error, toast, handleStatusChange, handleCloseToast: closeToast }
}
