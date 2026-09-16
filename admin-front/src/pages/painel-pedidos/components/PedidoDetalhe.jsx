import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { FEATURE_FLAGS } from '../../../config/featureFlags.js'
import { PEDIDO_STATUS } from '../service/pedidos.model.js'

function PedidoDetalhe({ pedido, open, onClose, onStatusChange }) {
  const [salvando, setSalvando] = useState(false)

  if (!pedido) return null

  async function handleStatusChange(event) {
    const novoStatus = event.target.value
    setSalvando(true)
    try {
      await onStatusChange(pedido.id, novoStatus)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{pedido.veiculo.modelo} — {pedido.veiculo.placa}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body1">Serviço: {pedido.servico}</Typography>
          <Typography variant="body2" color="text.secondary">
            Horário: {new Date(pedido.horario).toLocaleString('pt-BR')}
          </Typography>

          <FormControl fullWidth disabled={salvando}>
            <InputLabel id="pedido-status-label">Status</InputLabel>
            <Select
              labelId="pedido-status-label"
              label="Status"
              value={pedido.status}
              onChange={handleStatusChange}
            >
              {Object.entries(PEDIDO_STATUS).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {FEATURE_FLAGS.fotosPedido && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Fotos do veículo</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {pedido.fotos.map((foto) => (
                  <img
                    key={foto}
                    src={foto}
                    alt={`Foto do veículo ${pedido.veiculo.placa}`}
                    width={120}
                    height={90}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}

export default PedidoDetalhe
