import { useMemo, useState } from 'react'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { PickerDay } from '@mui/x-date-pickers/PickerDay'
import Badge from '@mui/material/Badge'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import { getIntercorrencias, createIntercorrencia } from './service/disponibilidade.service.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { useToast } from '../../hooks/useToast.js'

function DiaComIntercorrencia(props) {
  const { diasComIntercorrencia, day, outsideCurrentMonth, ...other } = props
  const marcado = !outsideCurrentMonth && diasComIntercorrencia.has(day.format('YYYY-MM-DD'))
  return (
    <Badge overlap="circular" variant="dot" color="warning" invisible={!marcado}>
      <PickerDay {...other} day={day} outsideCurrentMonth={outsideCurrentMonth} />
    </Badge>
  )
}

function Disponibilidade() {
  const { data: intercorrencias, setData: setIntercorrencias, loading, error } = useFetch(getIntercorrencias)
  const { toast, showToast, closeToast } = useToast()
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [diaInteiro, setDiaInteiro] = useState(true)
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [salvando, setSalvando] = useState(false)

  const diasComIntercorrencia = useMemo(
    () => new Set((intercorrencias ?? []).map((item) => item.data)),
    [intercorrencias],
  )

  const intercorrenciaSelecionada = useMemo(
    () => (intercorrencias ?? []).find((item) => item.data === diaSelecionado) ?? null,
    [intercorrencias, diaSelecionado],
  )

  function handleSelecionarDia(novoDia) {
    setDiaSelecionado(novoDia.format('YYYY-MM-DD'))
    setMotivo('')
    setDiaInteiro(true)
    setHoraInicio('')
    setHoraFim('')
  }

  async function handleSalvarIntercorrencia() {
    setSalvando(true)
    try {
      const nova = await createIntercorrencia({
        data: diaSelecionado,
        motivo,
        diaInteiro,
        ...(diaInteiro ? {} : { horaInicio, horaFim }),
      })
      setIntercorrencias((atuais) => [...atuais, nova])
      setDiaSelecionado(null)
      showToast('Intercorrência salva.')
    } catch (err) {
      showToast(`Erro ao salvar intercorrência: ${err.message}`, 'error')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return <CircularProgress />
  }

  if (error) {
    return <Alert severity="error">Não foi possível carregar a disponibilidade: {error}</Alert>
  }

  return (
    <>
      <PageHeader title="Disponibilidade" />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateCalendar
          onChange={handleSelecionarDia}
          slots={{ day: DiaComIntercorrencia }}
          slotProps={{ day: { diasComIntercorrencia } }}
        />
      </LocalizationProvider>

      <Dialog open={Boolean(diaSelecionado)} onClose={() => setDiaSelecionado(null)} fullWidth maxWidth="xs">
        <DialogTitle>Intercorrência — {diaSelecionado}</DialogTitle>
        <DialogContent>
          {intercorrenciaSelecionada ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Typography variant="body1">Motivo: {intercorrenciaSelecionada.motivo}</Typography>
              <Typography variant="body2" color="text.secondary">
                {intercorrenciaSelecionada.diaInteiro
                  ? 'Fechado o dia inteiro'
                  : `Fechado das ${intercorrenciaSelecionada.horaInicio} às ${intercorrenciaSelecionada.horaFim}`}
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Motivo"
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch checked={diaInteiro} onChange={(event) => setDiaInteiro(event.target.checked)} />
                }
                label="Dia inteiro"
              />
              {!diaInteiro && (
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Início"
                    type="time"
                    value={horaInicio}
                    onChange={(event) => setHoraInicio(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Fim"
                    type="time"
                    value={horaFim}
                    onChange={(event) => setHoraFim(event.target.value)}
                    fullWidth
                  />
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiaSelecionado(null)}>Fechar</Button>
          {!intercorrenciaSelecionada && (
            <Button onClick={handleSalvarIntercorrencia} disabled={salvando || !motivo} variant="contained">
              Salvar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast}>
        <Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default Disponibilidade
