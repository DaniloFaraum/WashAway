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
import {
  PEDIDO_STATUS,
  descreverVeiculo,
  formatarHorario,
  formatarPreco,
  separarPendentes,
} from './service/pedidos.model.js'
import { usePedidos } from './usePedidos.js'
import PedidoDetalhe from './components/PedidoDetalhe.jsx'
import AcoesPedido from './components/AcoesPedido.jsx'
import RecusarPedidoDialog from './components/RecusarPedidoDialog.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'

function CardPedido({ pedido, destaque, onAbrir, onAcao, salvando }) {
  return (
    <Card
      variant={destaque ? 'outlined' : 'elevation'}
      sx={destaque ? { borderColor: 'warning.main', borderWidth: 2 } : undefined}
    >
      <CardActionArea onClick={onAbrir}>
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
      {/* Aceitar/Recusar direto no card só para os pendentes (I15); fora do
          CardActionArea, para não aninhar botões. */}
      {destaque && (
        <CardContent sx={{ pt: 0 }}>
          <AcoesPedido pedido={pedido} onAcao={onAcao} disabled={salvando} size="small" />
        </CardContent>
      )}
    </Card>
  )
}

function PainelPedidos() {
  const { pedidos, loading, error, toast, handleStatusChange, handleCloseToast } = usePedidos()
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState(null)
  const [pedidoParaRecusarId, setPedidoParaRecusarId] = useState(null)
  const [salvandoId, setSalvandoId] = useState(null)
  const pedidoSelecionado = pedidos.find((pedido) => pedido.id === pedidoSelecionadoId) ?? null
  const pedidoParaRecusar = pedidos.find((pedido) => pedido.id === pedidoParaRecusarId) ?? null

  async function mudarStatus(id, status, motivo) {
    setSalvandoId(id)
    try {
      return await handleStatusChange(id, status, motivo)
    } finally {
      setSalvandoId(null)
    }
  }

  function handleAcao(pedido, status) {
    if (status === 'recusado') {
      setPedidoParaRecusarId(pedido.id)
      return
    }
    mudarStatus(pedido.id, status)
  }

  if (loading) {
    return <CircularProgress />
  }

  if (error) {
    return <Alert severity="error">Não foi possível carregar os pedidos: {error}</Alert>
  }

  const { pendentes, demais } = separarPendentes(pedidos)

  function renderCard(pedido, destaque) {
    return (
      <CardPedido
        key={pedido.id}
        pedido={pedido}
        destaque={destaque}
        salvando={salvandoId === pedido.id}
        onAbrir={() => setPedidoSelecionadoId(pedido.id)}
        onAcao={(status) => handleAcao(pedido, status)}
      />
    )
  }

  return (
    <>
      <PageHeader title="Pedidos" />
      <Stack spacing={3}>
        {pendentes.length > 0 && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h6">Aguardando sua resposta</Typography>
              <Chip label={pendentes.length} color="warning" size="small" />
            </Stack>
            {pendentes.map((pedido) => renderCard(pedido, true))}
          </Stack>
        )}

        {demais.length > 0 && (
          <Stack spacing={2}>
            {pendentes.length > 0 && <Typography variant="h6">Demais pedidos</Typography>}
            {demais.map((pedido) => renderCard(pedido, false))}
          </Stack>
        )}
      </Stack>

      <PedidoDetalhe
        pedido={pedidoSelecionado}
        open={Boolean(pedidoSelecionado)}
        onClose={() => setPedidoSelecionadoId(null)}
        onAcao={(status) => pedidoSelecionado && handleAcao(pedidoSelecionado, status)}
        salvando={Boolean(pedidoSelecionado) && salvandoId === pedidoSelecionado?.id}
      />

      <RecusarPedidoDialog
        key={pedidoParaRecusarId ?? 'nenhum'}
        pedido={pedidoParaRecusar}
        open={Boolean(pedidoParaRecusar)}
        onClose={() => setPedidoParaRecusarId(null)}
        onConfirmar={(motivo) => mudarStatus(pedidoParaRecusarId, 'recusado', motivo)}
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
