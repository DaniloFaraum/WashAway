import { useState } from 'react'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import {
  NOMES_DIAS,
  ORDEM_SEMANA,
  diaSemanaNoFuso,
  edicaoParaDias,
  horariosParaEdicao,
} from '../horarioFuncionamento.js'
import { salvarHorarios } from '../service/disponibilidade.service.js'

/**
 * Horário semanal do lava-rápido logado, editável (I19 parte 2): por dia, "Fechado"
 * ou abertura/fechamento. Salvar substitui os 7 dias (`PUT /lavaRapidos/:id/horarios`).
 * @param {{
 *   empresa: import('../../../login/service/lavaRapidos.model.js').LavaRapido,
 *   onSalvo?: () => void | Promise<void>,
 *   mostrarAviso: (mensagem: string, severidade?: 'success' | 'error') => void,
 * }} props
 */
function HorarioFuncionamento({ empresa, onSalvo, mostrarAviso }) {
  const [edicao, setEdicao] = useState(() => horariosParaEdicao(empresa.horarios))
  const [salvando, setSalvando] = useState(false)
  const hoje = diaSemanaNoFuso(new Date())
  const semHorario = empresa.horarios.every((horario) => !horario.definido)

  function alterarDia(diaSemana, mudanca) {
    setEdicao((atual) => atual.map((dia) => (dia.diaSemana === diaSemana ? { ...dia, ...mudanca } : dia)))
  }

  async function handleSalvar() {
    setSalvando(true)
    try {
      try {
        // O formulário passa a mostrar o que o backend gravou.
        setEdicao(horariosParaEdicao(await salvarHorarios(edicaoParaDias(edicao))))
      } catch (err) {
        mostrarAviso(`Erro ao salvar o horário: ${err.message}`, 'error')
        return
      }
      mostrarAviso('Horário de funcionamento salvo.')
      // `onSalvo` recarrega a empresa (status do topo e `empresa.horarios`); se falhar,
      // o horário já está salvo — o aviso não pode dizer que não salvou.
      try {
        await onSalvo?.()
      } catch (err) {
        mostrarAviso(`Horário salvo, mas não foi possível atualizar o status: ${err.message}`, 'error')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, maxWidth: 520 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">Horário de funcionamento</Typography>
        <Chip
          size="small"
          label={empresa.isOpen ? 'Aberto agora' : 'Fechado agora'}
          color={empresa.isOpen ? 'success' : 'default'}
        />
      </Stack>
      {semHorario && (
        <Alert severity="info" sx={{ mb: 1 }}>
          Nenhum horário cadastrado: até você salvar, só as intercorrências fecham o lava-rápido.
        </Alert>
      )}
      <Table size="small">
        <TableBody>
          {ORDEM_SEMANA.map((diaSemana) => {
            const dia = edicao[diaSemana]
            const ehHoje = diaSemana === hoje
            return (
              <TableRow key={diaSemana} selected={ehHoje}>
                <TableCell sx={{ fontWeight: ehHoje ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>
                  {NOMES_DIAS[diaSemana]}
                  {ehHoje && ' (hoje)'}
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={dia.fechado}
                        onChange={(event) => alterarDia(diaSemana, { fechado: event.target.checked })}
                      />
                    }
                    label="Fechado"
                  />
                </TableCell>
                <TableCell>
                  {!dia.fechado && (
                    <Stack direction="row" spacing={1}>
                      <TextField
                        size="small"
                        type="time"
                        label="Abertura"
                        value={dia.abertura}
                        onChange={(event) => alterarDia(diaSemana, { abertura: event.target.value })}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        size="small"
                        type="time"
                        label="Fechamento"
                        value={dia.fechamento}
                        onChange={(event) => alterarDia(diaSemana, { fechamento: event.target.value })}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleSalvar} disabled={salvando}>
          Salvar horário
        </Button>
      </Stack>
    </Paper>
  )
}

export default HorarioFuncionamento
