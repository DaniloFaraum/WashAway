import { useEffect, useState } from 'react'
import { getPedidos, updatePedidoStatus } from './service/pedidos.service.js'

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
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    getPedidos()
      .then(setPedidos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(id, status) {
    try {
      const pedidoAtualizado = await updatePedidoStatus(id, status)
      setPedidos((atuais) =>
        atuais.map((pedido) => (pedido.id === id ? pedidoAtualizado : pedido)),
      )
      setToast({ open: true, message: 'Status atualizado.', severity: 'success' })
    } catch (err) {
      setToast({ open: true, message: `Erro ao atualizar status: ${err.message}`, severity: 'error' })
    }
  }

  function handleCloseToast() {
    setToast((atual) => ({ ...atual, open: false }))
  }

  return { pedidos, loading, error, toast, handleStatusChange, handleCloseToast }
}
