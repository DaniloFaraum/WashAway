import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { MOTIVO_RECUSA_MAX } from '../service/pedidos.model.js'

/**
 * Confirmação da recusa (I15), com motivo opcional (até 200 caracteres).
 * `onConfirmar(motivo)` devolve `true` no sucesso; só então o diálogo fecha.
 * Montado com `key` do pedido, para o campo começar vazio a cada pedido.
 */
function RecusarPedidoDialog({ pedido, open, onClose, onConfirmar }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleConfirmar() {
    setEnviando(true)
    try {
      if (await onConfirmar(motivo)) onClose()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onClose={enviando ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Recusar pedido</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {pedido?.cliente?.nome ? `O pedido de ${pedido.cliente.nome} será recusado.` : 'O pedido será recusado.'} Essa
          ação não pode ser desfeita.
        </DialogContentText>
        <TextField
          label="Motivo (opcional)"
          value={motivo}
          onChange={(event) => setMotivo(event.target.value.slice(0, MOTIVO_RECUSA_MAX))}
          multiline
          minRows={2}
          fullWidth
          disabled={enviando}
          slotProps={{ htmlInput: { maxLength: MOTIVO_RECUSA_MAX } }}
          helperText={`${motivo.length}/${MOTIVO_RECUSA_MAX}`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={enviando}>
          Cancelar
        </Button>
        <Button color="error" variant="contained" onClick={handleConfirmar} disabled={enviando}>
          Confirmar recusa
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RecusarPedidoDialog
