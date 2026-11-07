import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'

// Rota que o painel não conhece (URL digitada errada, favorito antigo): em vez de
// uma tela em branco, avisa e leva de volta aos pedidos.
function NaoEncontrado() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h5" component="h1">
        Página não encontrada
      </Typography>
      <Typography color="text.secondary">O endereço que você abriu não existe no painel.</Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Voltar aos pedidos
      </Button>
    </Stack>
  )
}

export default NaoEncontrado
