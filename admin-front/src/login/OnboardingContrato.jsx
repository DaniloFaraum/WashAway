import { useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useToast } from '../hooks/useToast.js'
import { isAceiteValido, TEXTO_ACEITE } from './service/onboarding.model.js'

function OnboardingContrato({ solicitacao, onAssinar, onVoltar }) {
  const [aceite, setAceite] = useState('')
  const [assinando, setAssinando] = useState(false)
  const { toast, showToast, closeToast } = useToast()

  async function handleSubmit(event) {
    event.preventDefault()
    setAssinando(true)
    try {
      await onAssinar()
    } catch (err) {
      showToast(err.message, 'error')
      setAssinando(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5">Contrato de parceria</Typography>
              <Chip color="success" variant="outlined" label="Aprovada — aguardando contrato" />
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {solicitacao.name} · CNPJ {solicitacao.cnpj}
            </Typography>

            {solicitacao.contrato ? (
              <>
                <Typography variant="subtitle1">
                  {solicitacao.contrato.titulo} (versão {solicitacao.contrato.versao})
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, maxHeight: 280, overflowY: 'auto', whiteSpace: 'pre-line' }}
                >
                  <Typography variant="body2">{solicitacao.contrato.conteudo}</Typography>
                </Paper>
              </>
            ) : (
              <Alert severity="warning">Contrato indisponível no momento.</Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label={`Digite "${TEXTO_ACEITE}" para assinar`}
                  value={aceite}
                  onChange={(event) => setAceite(event.target.value)}
                  fullWidth
                />
                <Typography variant="body2" color="text.secondary">
                  Depois de assinar, você entra direto no painel. A senha padrão de acesso é{' '}
                  <strong>admin</strong>.
                </Typography>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
                  <Button onClick={onVoltar} disabled={assinando}>
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={assinando || !solicitacao.contrato || !isAceiteValido(aceite)}
                  >
                    Assinar contrato
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Container>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast}>
        <Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default OnboardingContrato
