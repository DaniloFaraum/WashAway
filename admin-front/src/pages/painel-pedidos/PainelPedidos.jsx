import { useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import { PEDIDO_STATUS, descreverVeiculo, formatarHorario, formatarPreco } from './service/pedidos.model.js'
import { usePedidos } from './usePedidos.js'
import PedidoDetalhe from './components/PedidoDetalhe.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'

function PainelPedidos() {
  const { pedidos, loading, error, toast, handleStatusChange, handleCloseToast } = usePedidos()
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState(null)
  const pedidoSelecionado = pedidos.find((pedido) => pedido.id === pedidoSelecionadoId) ?? null

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
            <CardActionArea onClick={() => setPedidoSelecionadoId(pedido.id)}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">{pedido.cliente?.nome ?? '—'}</Typography>
                    <Typography variant="subtitle1">{formatarPreco(pedido.precoTotal)}</Typography>
                  </Stack>
                  <Typography variant="body2">{descreverVeiculo(pedido.veiculo)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pedido.servicos.map((servico) => servico.nome).join(' · ') || '—'}
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
        onClose={() => setPedidoSelecionadoId(null)}
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
