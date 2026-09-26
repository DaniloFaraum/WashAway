import { useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useToast } from '../hooks/useToast.js'

function Login({ onEntrar, onCadastrar }) {
  const [modo, setModo] = useState('entrar')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { toast, showToast, closeToast } = useToast()

  async function handleSubmit(event) {
    event.preventDefault()
    setEnviando(true)
    try {
      if (modo === 'entrar') {
        await onEntrar({ cnpj, senha })
      } else {
        await onCadastrar({ name, address, cnpj })
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEnviando(false)
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
      }}
    >
      <Container maxWidth="xs">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" align="center" gutterBottom>
            WashAway
          </Typography>

          <Tabs value={modo} onChange={(_, value) => setModo(value)} variant="fullWidth" sx={{ mb: 3 }}>
            <Tab label="Entrar" value="entrar" />
            <Tab label="Cadastrar" value="cadastrar" />
          </Tabs>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {modo === 'cadastrar' && (
                <>
                  <TextField
                    label="Nome da empresa"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Endereço"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    fullWidth
                  />
                </>
              )}

              <TextField
                label="CNPJ"
                value={cnpj}
                onChange={(event) => setCnpj(event.target.value.replace(/\D/g, ''))}
                required
                fullWidth
                inputProps={{ maxLength: 14, inputMode: 'numeric' }}
                helperText="Só números, 14 dígitos"
              />

              {modo === 'entrar' && (
                <TextField
                  label="Senha"
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  required
                  fullWidth
                />
              )}

              {modo === 'cadastrar' && (
                <Typography variant="body2" color="text.secondary">
                  A senha padrão de toda empresa cadastrada é <strong>admin</strong>.
                </Typography>
              )}

              <Button type="submit" variant="contained" size="large" disabled={enviando}>
                {modo === 'entrar' ? 'Entrar' : 'Cadastrar'}
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

export default Login
