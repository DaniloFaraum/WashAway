import { useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import {
  atualizarServico,
  criarServico,
  getItensCatalogo,
  getServicos,
  updateServicoAtivo,
} from './service/servicos.service.js'
import ServicoFormDialog from './components/ServicoFormDialog.jsx'
import { formatarDuracao } from './formatarDuracao.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { useToast } from '../../hooks/useToast.js'

function Servicos() {
  const { data: servicos, setData: setServicos, loading, error } = useFetch(getServicos)
  const { toast, showToast, closeToast } = useToast()
  const { data: itensCatalogo } = useFetch(getItensCatalogo)
  const [salvandoIds, setSalvandoIds] = useState(() => new Set())
  // `null` = fechado; `{ servico: null }` = criando; `{ servico }` = editando
  const [formulario, setFormulario] = useState(null)
  const [salvandoFormulario, setSalvandoFormulario] = useState(false)

  async function handleSalvarFormulario(dados) {
    setSalvandoFormulario(true)
    try {
      const { servico } = formulario
      if (servico) {
        const servicoAtualizado = await atualizarServico(servico.id, dados)
        setServicos((atuais) => atuais.map((atual) => (atual.id === servico.id ? servicoAtualizado : atual)))
      } else {
        const servicoCriado = await criarServico(dados)
        setServicos((atuais) => [...atuais, servicoCriado])
      }
      setFormulario(null)
    } catch (err) {
      showToast(`Erro ao salvar serviço: ${err.message}`, 'error')
    } finally {
      setSalvandoFormulario(false)
    }
  }

  async function handleToggleAtivo(id, ativo) {
    setSalvandoIds((atuais) => new Set(atuais).add(id))
    try {
      const servicoAtualizado = await updateServicoAtivo(id, ativo)
      setServicos((atuais) =>
        atuais.map((servico) => (servico.id === id ? servicoAtualizado : servico)),
      )
    } catch (err) {
      showToast(`Erro ao atualizar serviço: ${err.message}`, 'error')
    } finally {
      setSalvandoIds((atuais) => {
        const proximo = new Set(atuais)
        proximo.delete(id)
        return proximo
      })
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
      <PageHeader
        title="Serviços"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!itensCatalogo}
            onClick={() => setFormulario({ servico: null })}
          >
            Novo serviço
          </Button>
        }
      />
      <Stack spacing={2}>
        {servicos.map((servico) => (
          <Card key={servico.id}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1">{servico.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    R$ {servico.preco.toFixed(2)} · ~{formatarDuracao(servico.duracaoMinutos)}
                  </Typography>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {servico.itens.map((item) => (
                      <Chip key={item.id} label={item.nome} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    disabled={!itensCatalogo}
                    onClick={() => setFormulario({ servico })}
                  >
                    Editar
                  </Button>
                  <FormControlLabel
                    labelPlacement="start"
                    label={servico.ativo ? 'Ativo' : 'Inativo'}
                    control={
                      <Switch
                        checked={servico.ativo}
                        disabled={salvandoIds.has(servico.id)}
                        onChange={(event) => handleToggleAtivo(servico.id, event.target.checked)}
                      />
                    }
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {formulario && (
        <ServicoFormDialog
          key={formulario.servico?.id ?? 'novo'}
          open
          servico={formulario.servico}
          itensCatalogo={itensCatalogo}
          salvando={salvandoFormulario}
          onClose={() => setFormulario(null)}
          onSalvar={handleSalvarFormulario}
        />
      )}

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast}>
        <Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default Servicos
