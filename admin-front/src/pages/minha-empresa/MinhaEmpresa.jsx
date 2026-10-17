import { useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { useToast } from '../../hooks/useToast.js'
import SolicitarExclusaoDialog from './components/SolicitarExclusaoDialog.jsx'
import {
  cancelarSolicitacaoExclusao,
  getSolicitacaoExclusao,
  solicitarExclusao,
} from './service/minhaEmpresa.service.js'

function formatarData(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''
}

/** Aviso sobre a última solicitação que já foi decidida (recusada ou cancelada). */
function AvisoUltimaSolicitacao({ solicitacao }) {
  if (solicitacao?.status === 'recusada') {
    return (
      <Alert severity="info">
        O pedido de exclusão de {formatarData(solicitacao.criadoEm)} foi recusado pela equipe.
        {solicitacao.observacao && ` Observação: ${solicitacao.observacao}`}
      </Alert>
    )
  }
  if (solicitacao?.status === 'cancelada') {
    return <Alert severity="info">O pedido de exclusão de {formatarData(solicitacao.criadoEm)} foi cancelado.</Alert>
  }
  return null
}

function MinhaEmpresa({ empresaLogada }) {
  const { data: solicitacao, setData: setSolicitacao, loading, error } = useFetch(getSolicitacaoExclusao)
  const { toast, showToast, closeToast } = useToast()
  const [dialogAberto, setDialogAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Depois de um erro (ex.: a equipe decidiu com a tela aberta e o cancelamento
  // deu 404), mostra o estado real da solicitação em vez do que estava na tela.
  async function recarregar() {
    try {
      setSolicitacao(await getSolicitacaoExclusao())
    } catch {
      // Mantém o que está na tela; o toast já avisou do erro.
    }
  }

  async function confirmarSolicitacao(motivo) {
    setEnviando(true)
    try {
      setSolicitacao(await solicitarExclusao(motivo))
      setDialogAberto(false)
      showToast('Pedido de exclusão enviado para a equipe.')
    } catch (err) {
      showToast(err.message, 'error')
      await recarregar()
    } finally {
      setEnviando(false)
    }
  }

  async function cancelar() {
    setEnviando(true)
    try {
      setSolicitacao(await cancelarSolicitacaoExclusao())
      showToast('Pedido de exclusão cancelado.')
    } catch (err) {
      showToast(err.message, 'error')
      await recarregar()
    } finally {
      setEnviando(false)
    }
  }

  const pendente = solicitacao?.status === 'pendente'

  return (
    <>
      <PageHeader title="Minha empresa" />
      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1">{empresaLogada?.name}</Typography>
            {empresaLogada?.address && (
              <Typography variant="body2" color="text.secondary">
                {empresaLogada.address}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Exclusão da empresa</Typography>
              {loading && <CircularProgress size={24} />}
              {error && <Alert severity="error">Não foi possível carregar a solicitação de exclusão: {error}</Alert>}
              {!loading && !error && pendente && (
                <>
                  <Alert severity="warning">
                    Exclusão solicitada em {formatarData(solicitacao.criadoEm)}. A equipe Wash Your Way está analisando o
                    pedido.
                    {solicitacao.motivo && ` Motivo: ${solicitacao.motivo}`}
                  </Alert>
                  <div>
                    <Button variant="outlined" onClick={cancelar} disabled={enviando}>
                      Cancelar solicitação
                    </Button>
                  </div>
                </>
              )}
              {!loading && !error && !pendente && (
                <>
                  <AvisoUltimaSolicitacao solicitacao={solicitacao} />
                  <Typography variant="body2" color="text.secondary">
                    A exclusão passa pela análise da equipe. Se aprovada, a empresa e os dados dela são excluídos de vez.
                  </Typography>
                  <div>
                    <Button color="error" variant="outlined" onClick={() => setDialogAberto(true)} disabled={enviando}>
                      Solicitar exclusão da empresa
                    </Button>
                  </div>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Montado só aberto: o motivo começa vazio a cada abertura. */}
      {dialogAberto && (
        <SolicitarExclusaoDialog
          open
          enviando={enviando}
          onClose={() => setDialogAberto(false)}
          onConfirmar={confirmarSolicitacao}
        />
      )}

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast}>
        <Alert severity={toast.severity} onClose={closeToast} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default MinhaEmpresa
