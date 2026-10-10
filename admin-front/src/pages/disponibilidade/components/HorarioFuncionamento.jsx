import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import {
  NOMES_DIAS,
  ORDEM_SEMANA,
  diaSemanaNoFuso,
  formatarHorarioDoDia,
} from '../horarioFuncionamento.js'

/**
 * Horário semanal do lava-rápido logado, só leitura (a edição é o I19 parte 2).
 * @param {{ empresa: import('../../../login/service/lavaRapidos.model.js').LavaRapido }} props
 */
function HorarioFuncionamento({ empresa }) {
  const porDia = new Map(empresa.horarios.map((horario) => [horario.diaSemana, horario]))
  const hoje = diaSemanaNoFuso(new Date())

  return (
    <Paper variant="outlined" sx={{ p: 2, maxWidth: 360 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">Horário de funcionamento</Typography>
        <Chip
          size="small"
          label={empresa.isOpen ? 'Aberto agora' : 'Fechado agora'}
          color={empresa.isOpen ? 'success' : 'default'}
        />
      </Stack>
      {empresa.horarios.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum horário cadastrado.
        </Typography>
      ) : (
        <Table size="small">
          <TableBody>
            {ORDEM_SEMANA.map((dia) => {
              const ehHoje = dia === hoje
              const fontWeight = ehHoje ? 'bold' : 'normal'
              return (
                <TableRow key={dia} selected={ehHoje}>
                  <TableCell sx={{ fontWeight }}>
                    {NOMES_DIAS[dia]}
                    {ehHoje && ' (hoje)'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight }}>
                    {formatarHorarioDoDia(porDia.get(dia))}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  )
}

export default HorarioFuncionamento
