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
 *   handleStatusChange: (id: string, status: import('./service/pedidos.model.js').Pedido['status']) => Promise<void>,
 *   handleCloseToast: () => void,
 * }}
 */
export function usePedidos() {
  const { data: pedidos, setData: setPedidos, loading, error } = useFetch(getPedidos)
  const { toast, showToast, closeToast } = useToast()

  async function handleStatusChange(id, status) {
    try {
      const pedidoAtualizado = await updatePedidoStatus(id, status)
      setPedidos((atuais) =>
        atuais.map((pedido) => (pedido.id === id ? pedidoAtualizado : pedido)),
      )
      showToast('Status atualizado.')
    } catch (err) {
      showToast(`Erro ao atualizar status: ${err.message}`, 'error')
    }
  }

  return { pedidos: pedidos ?? [], loading, error, toast, handleStatusChange, handleCloseToast: closeToast }
}
