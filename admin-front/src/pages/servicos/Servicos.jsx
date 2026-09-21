import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import { getServicos, updateServicoAtivo } from './service/servicos.service.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { useToast } from '../../hooks/useToast.js'

function Servicos() {
  const { data: servicos, setData: setServicos, loading, error } = useFetch(getServicos)
  const { toast, showToast, closeToast } = useToast()

  async function handleToggleAtivo(id, ativo) {
    try {
      const servicoAtualizado = await updateServicoAtivo(id, ativo)
      setServicos((atuais) =>
        atuais.map((servico) => (servico.id === id ? servicoAtualizado : servico)),
      )
    } catch (err) {
      showToast(`Erro ao atualizar serviço: ${err.message}`, 'error')
    }
  }

  if (loading) {
    return <CircularProgress />
  }

  if (error) {
    return <Alert severity="error">Não foi possível carregar os serviços: {error}</Alert>
  }

  return (
    <>
      <PageHeader title="Serviços" />
      <Stack spacing={2}>
        {servicos.map((servico) => (
          <Card key={servico.id}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1">{servico.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {servico.categoria} — R$ {servico.preco.toFixed(2)}
                  </Typography>
                </Stack>
                <FormControlLabel
                  labelPlacement="start"
                  label={servico.ativo ? 'Ativo' : 'Inativo'}
                  control={
                    <Switch
                      checked={servico.ativo}
                      onChange={(event) => handleToggleAtivo(servico.id, event.target.checked)}
                    />
                  }
                />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast}>
        <Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default Servicos
