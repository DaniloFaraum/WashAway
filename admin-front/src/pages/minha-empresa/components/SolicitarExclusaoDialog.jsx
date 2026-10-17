import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { MOTIVO_MAXIMO } from '../service/minhaEmpresa.model.js'

function SolicitarExclusaoDialog({ open, enviando, onClose, onConfirmar }) {
  const [motivo, setMotivo] = useState('')

  function fechar() {
    if (enviando) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={fechar} fullWidth maxWidth="sm">
      <DialogTitle>Solicitar exclusão da empresa</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          A equipe Wash Your Way vai analisar o pedido. Se for aprovado, a empresa e os dados dela (pedidos, serviços e
          disponibilidade) serão excluídos de vez. Enquanto o pedido estiver pendente, você pode cancelá-lo aqui.
        </DialogContentText>
        <TextField
          label="Motivo (opcional)"
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          multiline
          minRows={3}
          fullWidth
          slotProps={{ htmlInput: { maxLength: MOTIVO_MAXIMO } }}
          helperText={`${motivo.length}/${MOTIVO_MAXIMO}`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={fechar} disabled={enviando}>
          Voltar
        </Button>
        <Button color="error" variant="contained" disabled={enviando} onClick={() => onConfirmar(motivo)}>
          Solicitar exclusão
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SolicitarExclusaoDialog
