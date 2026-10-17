import type { Intercorrencia } from '@/features/intercorrencias/service/intercorrencias.model'
import { formatarHorarioDoDia, temHorarioDefinido } from '@/features/lava-rapidos/formatarHorario'
import type { HorarioDia } from '@/features/lava-rapidos/service/lavaRapidos.model'
import { diaDaSemana } from './dataHora'
import { PedidoRecusadoError } from './service/pedidos.service'

// Passo "Data e hora" (I20): o app só INFORMA o horário de funcionamento do dia
// escolhido e os fechamentos daquele dia; quem bloqueia é o backend
// (`400 HORARIO_INDISPONIVEL` no POST /pedidos).

export const CODIGO_HORARIO_INDISPONIVEL = 'HORARIO_INDISPONIVEL'

/**
 * "Horário nesse dia: 08:00–18:00", "Fechado nesse dia" ou "Horário não
 * informado nesse dia"; `null` quando o lava-rápido não tem horário cadastrado
 * em nenhum dia (sem restrição de horário).
 */
export function textoHorarioNoDia(horarios: HorarioDia[], data: string): string | null {
  if (!temHorarioDefinido(horarios)) return null
  const texto = formatarHorarioDoDia(horarios.find((horario) => horario.diaSemana === diaDaSemana(data)))
  if (texto === 'Fechado') return 'Fechado nesse dia'
  if (texto === 'Horário não informado') return 'Horário não informado nesse dia'
  return `Horário nesse dia: ${texto}`
}

/** Avisos dos fechamentos (não reabertos) da data "YYYY-MM-DD": "Atenção: fechado das 14:00 às 16:00 (motivo)". */
export function avisosDeFechamentoNoDia(intercorrencias: Intercorrencia[], data: string): string[] {
  return intercorrencias
    .filter((intercorrencia) => intercorrencia.data === data && !intercorrencia.reaberta)
    .map(({ diaInteiro, horaInicio, horaFim, motivo }) =>
      diaInteiro || !horaInicio || !horaFim
        ? `Atenção: fechado nesse dia (${motivo})`
        : `Atenção: fechado das ${horaInicio} às ${horaFim} (${motivo})`,
    )
}

/** O backend recusou o pedido pelo horário (fora do funcionamento ou num fechamento)? */
export function isRecusaDeHorario(erro: unknown): erro is PedidoRecusadoError {
  return erro instanceof PedidoRecusadoError && erro.codigo === CODIGO_HORARIO_INDISPONIVEL
}
