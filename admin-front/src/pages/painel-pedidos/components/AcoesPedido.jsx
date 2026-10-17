import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import { PROXIMOS_STATUS } from '../service/pedidos.model.js'

/**
 * Botões das próximas ações permitidas a partir do status atual (I15):
 * pendente → Aceitar/Recusar; aceito → Iniciar atendimento; em andamento → Concluir.
 * `onAcao(status)` — "Recusar" abre a confirmação no pai.
 */
function AcoesPedido({ pedido, onAcao, disabled = false, size = 'medium' }) {
  const acoes = PROXIMOS_STATUS[pedido.status] ?? []
  if (acoes.length === 0) return null

  return (
    <Stack direction="row" spacing={1}>
      {acoes.map(({ status, label }) => (
        <Button
          key={status}
          size={size}
          variant={status === 'recusado' ? 'outlined' : 'contained'}
          color={status === 'recusado' ? 'error' : 'primary'}
          disabled={disabled}
          onClick={(event) => {
            // No card, não abrir o detalhe junto.
            event.stopPropagation()
            onAcao(status)
          }}
        >
          {label}
        </Button>
      ))}
    </Stack>
  )
}

export default AcoesPedido
