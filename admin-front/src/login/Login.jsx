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
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import { useToast } from '../hooks/useToast.js'
import { buscarCep } from './service/cep.service.js'

function montarAddress({ logradouro, numero, bairro, cidade, estado, cep }) {
  return `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${estado}, CEP ${cep}`
}

function Login({ onEntrar, onCadastrar }) {
  const [modo, setModo] = useState('entrar')
  const [name, setName] = useState('')
  const [cep, setCep] = useState('')
  const [numero, setNumero] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [cnpj, setCnpj] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { toast, showToast, closeToast } = useToast()

  async function buscarEnderecoPeloCep(cepDigitado) {
    setBuscandoCep(true)
    try {
      const endereco = await buscarCep(cepDigitado)
      if (!endereco) {
        showToast('CEP não encontrado — preencha o endereço manualmente.', 'error')
        return
      }
      setLogradouro(endereco.logradouro)
      setBairro(endereco.bairro)
      setCidade(endereco.cidade)
      setEstado(endereco.estado)
    } finally {
      setBuscandoCep(false)
    }
  }

  function handleCepChange(event) {
    const novoCep = event.target.value.replace(/\D/g, '')
    setCep(novoCep)
    if (novoCep.length === 8) {
      buscarEnderecoPeloCep(novoCep)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setEnviando(true)
    try {
      if (modo === 'entrar') {
        await onEntrar({ cnpj, senha })
      } else {
        const address = montarAddress({ logradouro, numero, bairro, cidade, estado, cep })
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
                    label="CEP"
                    value={cep}
                    onChange={handleCepChange}
                    fullWidth
                    inputProps={{ maxLength: 8, inputMode: 'numeric' }}
                    helperText="Só números, 8 dígitos"
                    slotProps={{
                      input: {
                        endAdornment: buscandoCep && (
                          <InputAdornment position="end">
                            <CircularProgress size={18} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Logradouro"
                      value={logradouro}
                      onChange={(event) => setLogradouro(event.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Número"
                      value={numero}
                      onChange={(event) => setNumero(event.target.value)}
                      required
                      sx={{ width: '40%' }}
                    />
                  </Stack>
                  <TextField
                    label="Bairro"
                    value={bairro}
                    onChange={(event) => setBairro(event.target.value)}
                    fullWidth
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Cidade"
                      value={cidade}
                      onChange={(event) => setCidade(event.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Estado"
                      value={estado}
                      onChange={(event) => setEstado(event.target.value)}
                      sx={{ width: '30%' }}
                    />
                  </Stack>
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
