import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import { esqueciSenha } from './service/senhas.service.js'

// "Esqueci minha senha" (i17-senha-gerada), dentro do card do Login. A
// confirmação é sempre a mesma mensagem genérica (não revela se o e-mail existe).
function EsqueciSenha({ onVoltar, onErro }) {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmacao, setConfirmacao] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setEnviando(true)
    try {
      setConfirmacao(await esqueciSenha(email.trim()))
    } catch (err) {
      onErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (confirmacao) {
    return (
      <Stack spacing={2}>
        <Alert severity="success">{confirmacao}</Alert>
        <Typography variant="body2" color="text.secondary">
          Entre com o CNPJ e a senha temporária do e-mail; o painel vai pedir para você definir uma senha nova.
        </Typography>
        <Button variant="contained" onClick={onVoltar}>
          Voltar ao login
        </Button>
      </Stack>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <Typography variant="subtitle1">Esqueci minha senha</Typography>
        <Typography variant="body2" color="text.secondary">
          Informe o e-mail de acesso da empresa. Vamos enviar uma senha temporária.
        </Typography>
        <TextField
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          fullWidth
          autoFocus
          autoComplete="email"
        />
        <Button type="submit" variant="contained" size="large" disabled={enviando}>
          Enviar senha temporária
        </Button>
        <Button onClick={onVoltar} disabled={enviando}>
          Voltar ao login
        </Button>
      </Stack>
    </Box>
  )
}

export default EsqueciSenha
