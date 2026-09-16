import { useEffect, useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import { getPedidos, updatePedidoStatus } from './service/pedidos.service.js'
import { PEDIDO_STATUS, formatarHorario } from './service/pedidos.model.js'
import PedidoDetalhe from './components/PedidoDetalhe.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'

function PainelPedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null)
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
      setPedidoSelecionado(pedidoAtualizado)
      setToast({ open: true, message: 'Status atualizado.', severity: 'success' })
    } catch (err) {
      setToast({ open: true, message: `Erro ao atualizar status: ${err.message}`, severity: 'error' })
    }
  }

  function handleCloseToast() {
    setToast((atual) => ({ ...atual, open: false }))
  }

  if (loading) {
    return <CircularProgress />
  }

  if (error) {
    return <Alert severity="error">Não foi possível carregar os pedidos: {error}</Alert>
  }

  return (
    <>
      <PageHeader title="Pedidos" />
      <Stack spacing={2}>
        {pedidos.map((pedido) => (
          <Card key={pedido.id}>
            <CardActionArea onClick={() => setPedidoSelecionado(pedido)}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="subtitle1">
                    {pedido.veiculo.modelo} — {pedido.veiculo.placa}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pedido.servico}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatarHorario(pedido.horario)}
                  </Typography>
                  <Chip
                    label={PEDIDO_STATUS[pedido.status]?.label ?? pedido.status}
                    color={PEDIDO_STATUS[pedido.status]?.color ?? 'default'}
                    size="small"
                    sx={{ alignSelf: 'flex-start' }}
                  />
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>

      <PedidoDetalhe
        pedido={pedidoSelecionado}
        open={Boolean(pedidoSelecionado)}
        onClose={() => setPedidoSelecionado(null)}
        onStatusChange={handleStatusChange}
      />

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleCloseToast}>
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default PainelPedidos
