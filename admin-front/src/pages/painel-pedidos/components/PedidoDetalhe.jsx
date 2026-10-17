import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import AcoesPedido from './AcoesPedido.jsx'
import { FEATURE_FLAGS } from '../../../config/featureFlags.js'
import {
  PEDIDO_STATUS,
  descreverVeiculo,
  formatarDataHora,
  formatarHorario,
  formatarPreco,
} from '../service/pedidos.model.js'
import { formatarDuracao } from '../../servicos/formatarDuracao.js'

/**
 * Detalhe do pedido. O status muda só pelas ações permitidas (I15, sem seletor
 * livre); `onAcao(status)` é tratado no `PainelPedidos` (recusar pede confirmação).
 */
function PedidoDetalhe({ pedido, open, onClose, onAcao, salvando }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {pedido && (
        <>
          <DialogTitle>Pedido de {pedido.cliente?.nome ?? '—'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body1">
                Veículo: {descreverVeiculo(pedido.veiculo)}
                {pedido.veiculo.cor ? ` (${pedido.veiculo.cor})` : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Horário: {formatarHorario(pedido.horario)}
                {pedido.duracaoMinutos ? ` · ~${formatarDuracao(pedido.duracaoMinutos)}` : ''}
              </Typography>

              <Stack spacing={0.5}>
                <Typography variant="subtitle2">Serviços</Typography>
                {pedido.servicos.map((servico, indice) => (
                  <Stack key={`${indice}-${servico.nome}`} direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2">{servico.nome}</Typography>
                    <Typography variant="body2">{formatarPreco(servico.preco)}</Typography>
                  </Stack>
                ))}
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2">Total</Typography>
                  <Typography variant="subtitle2">{formatarPreco(pedido.precoTotal)}</Typography>
                </Stack>
              </Stack>

              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="subtitle2">Status:</Typography>
                  <Chip
                    label={PEDIDO_STATUS[pedido.status]?.label ?? pedido.status}
                    color={PEDIDO_STATUS[pedido.status]?.color ?? 'default'}
                    size="small"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Alterado em: {pedido.statusAlteradoEm ? formatarDataHora(pedido.statusAlteradoEm) : '—'}
                </Typography>
                {pedido.status === 'recusado' && (
                  <Typography variant="body2">Motivo da recusa: {pedido.motivoRecusa ?? 'não informado'}</Typography>
                )}
                <AcoesPedido pedido={pedido} onAcao={onAcao} disabled={salvando} />
              </Stack>

              {FEATURE_FLAGS.fotosPedido && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Fotos do veículo</Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {pedido.fotos.map((foto) => (
                      <img
                        key={foto}
                        src={foto}
                        alt={`Foto do veículo ${pedido.veiculo.placa}`}
                        width={120}
                        height={90}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                      />
                    ))}
                  </Stack>
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Fechar</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

export default PedidoDetalhe
