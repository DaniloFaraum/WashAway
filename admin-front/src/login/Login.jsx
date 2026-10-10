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
import { useToast } from '../hooks/useToast.js'
import { buscarCep } from './service/cep.service.js'

// Mesmas regras do backend (onboarding, I17).
const SENHA_MINIMA = 8

/**
 * @returns {string | null} mensagem de erro, ou null se a senha do cadastro estiver ok
 */
function validarSenhaCadastro(senha, confirmarSenha) {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter no mínimo ${SENHA_MINIMA} caracteres.`
  if (senha !== confirmarSenha) return 'As senhas não conferem.'
  return null
}

function montarAddress({ logradouro, numero, bairro, cidade, estado, cep }) {
  return `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${estado}, CEP ${cep}`
}

function Login({ onEntrar, onCadastrar, aviso = null }) {
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
  const [email, setEmail] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { toast, showToast, closeToast } = useToast()

  async function handleBuscarCep() {
    if (cep.length !== 8) {
      showToast('Digite os 8 dígitos do CEP antes de buscar.', 'error')
      return
    }

    setBuscandoCep(true)
    try {
      const endereco = await buscarCep(cep)
      if (!endereco) {
        showToast('CEP não encontrado — preencha o endereço manualmente.', 'error')
        return
      }
      setLogradouro(endereco.logradouro)
      setBairro(endereco.bairro)
      setCidade(endereco.cidade)
      setEstado(endereco.estado)
    } catch {
      showToast('Não foi possível buscar o CEP agora — preencha o endereço manualmente.', 'error')
    } finally {
      setBuscandoCep(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setEnviando(true)
    try {
      if (modo === 'entrar') {
        await onEntrar({ cnpj, senha })
      } else {
        const erroSenha = validarSenhaCadastro(senha, confirmarSenha)
        if (erroSenha) {
          showToast(erroSenha, 'error')
          return
        }
        const address = montarAddress({ logradouro, numero, bairro, cidade, estado, cep })
        await onCadastrar({ name, address, cnpj, email: email.trim(), senha })
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
            Wash Your Way
          </Typography>

          {aviso && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {aviso}
            </Alert>
          )}

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
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="CEP"
                      value={cep}
                      onChange={(event) => setCep(event.target.value.replace(/\D/g, ''))}
                      required
                      fullWidth
                      inputProps={{ maxLength: 8, inputMode: 'numeric' }}
                      helperText="Só números, 8 dígitos"
                    />
                    <Button
                      onClick={handleBuscarCep}
                      disabled={buscandoCep || cep.length !== 8}
                      variant="outlined"
                      sx={{ height: 56, whiteSpace: 'nowrap' }}
                      startIcon={buscandoCep ? <CircularProgress size={16} /> : null}
                    >
                      Buscar
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Logradouro"
                      value={logradouro}
                      onChange={(event) => setLogradouro(event.target.value)}
                      required
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
                    required
                    fullWidth
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Cidade"
                      value={cidade}
                      onChange={(event) => setCidade(event.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Estado"
                      value={estado}
                      onChange={(event) => setEstado(event.target.value)}
                      required
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

              {modo === 'cadastrar' && (
                <TextField
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  fullWidth
                  autoComplete="email"
                  helperText="Usado para avisos e para recuperar o acesso"
                />
              )}

              <TextField
                label="Senha"
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                required
                fullWidth
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                helperText={modo === 'cadastrar' ? `Mínimo de ${SENHA_MINIMA} caracteres` : undefined}
              />

              {modo === 'cadastrar' && (
                <TextField
                  label="Confirmar senha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(event) => setConfirmarSenha(event.target.value)}
                  required
                  fullWidth
                  autoComplete="new-password"
                  error={confirmarSenha !== '' && confirmarSenha !== senha}
                  helperText={confirmarSenha !== '' && confirmarSenha !== senha ? 'As senhas não conferem' : undefined}
                />
              )}

              {modo === 'cadastrar' && (
                <Typography variant="body2" color="text.secondary">
                  Depois de enviar, você verá o contrato de parceria para assinar.
                </Typography>
              )}

              <Button type="submit" variant="contained" size="large" disabled={enviando}>
                {modo === 'entrar' ? 'Entrar' : 'Solicitar cadastro'}
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
