import { useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useToast } from '../hooks/useToast.js'
import { SENHA_MINIMA, validarNovaSenha } from './validarNovaSenha.js'

// Tela obrigatória depois de entrar com a senha temporária (i17-senha-gerada):
// o resto do painel só abre depois de definir a senha nova.
function DefinirNovaSenha({ empresa, onDefinir, onCancelar }) {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { toast, showToast, closeToast } = useToast()

  async function handleSubmit(event) {
    event.preventDefault()
    const erro = validarNovaSenha(novaSenha, confirmarSenha)
    if (erro) {
      showToast(erro, 'error')
      return
    }

    setEnviando(true)
    try {
      await onDefinir(novaSenha)
    } catch (err) {
      showToast(err.message, 'error')
      setEnviando(false)
    }
  }

  const naoConferem = confirmarSenha !== '' && confirmarSenha !== novaSenha

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="xs">
        <Paper sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <Typography variant="h5">Definir nova senha</Typography>
              {empresa && (
                <Typography variant="body2" color="text.secondary">
                  {empresa.name}
                </Typography>
              )}
              <Alert severity="info">
                Você entrou com uma senha temporária. Para continuar, defina uma senha nova para o painel.
              </Alert>

              <TextField
                label="Nova senha"
                type="password"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
                required
                fullWidth
                autoFocus
                autoComplete="new-password"
                helperText={`Mínimo de ${SENHA_MINIMA} caracteres`}
              />
              <TextField
                label="Confirmar nova senha"
                type="password"
                value={confirmarSenha}
                onChange={(event) => setConfirmarSenha(event.target.value)}
                required
                fullWidth
                autoComplete="new-password"
                error={naoConferem}
                helperText={naoConferem ? 'As senhas não conferem' : undefined}
              />

              <Button type="submit" variant="contained" size="large" disabled={enviando}>
                Salvar nova senha
              </Button>
              <Button onClick={onCancelar} disabled={enviando}>
                Voltar ao login
              </Button>
            </Stack>
          </Box>
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

export default DefinirNovaSenha
