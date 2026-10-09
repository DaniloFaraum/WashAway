import type { Intercorrencia } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { partesLocais } from '../../utils/fusoHorario.js'
import { horarioNaoDefinido, paraHorarioDia, type HorarioDia } from './horarios.service.js'

// Função compartilhada "o lava-rápido está aberto?" (I19), reaproveitada pelo
// isOpen de /lavaRapidos, pela validação do pedido (I20) e pela busca por
// horário (I9). Uma regra só para as três perguntas.

export type MotivoFechado =
  | { tipo: 'fora_do_horario'; horario: { abertura: string; fechamento: string } | null } // null = dia fechado
  | { tipo: 'intercorrencia'; intercorrencia: Intercorrencia }

export type Disponibilidade = { aberto: true } | { aberto: false; motivo: MotivoFechado }

export type HorarioDoDia = Omit<HorarioDia, 'diaSemana'>

const ABERTO: Disponibilidade = { aberto: true }

function horarioDoIntervalo(horario: HorarioDoDia) {
  return horario.abertura && horario.fechamento ? { abertura: horario.abertura, fechamento: horario.fechamento } : null
}

/**
 * Lógica pura (sem Prisma). Horas em "HH:mm" local, mesmo dia; com `fimLocal`
 * omitido avalia só o instante `inicioLocal`, senão o intervalo [inicio, fim).
 *
 * - Horário não definido (`definido: false`) = sem restrição de horário.
 * - Dia `fechado`, ou instante/intervalo fora de [abertura, fechamento) = `fora_do_horario`.
 * - Intercorrência `reaberta` é ignorada; de dia inteiro fecha; parcial fecha se
 *   [horaInicio, horaFim) intercepta o instante/intervalo.
 * O horário de funcionamento é conferido antes das intercorrências.
 */
export function avaliarDisponibilidade(
  horarioDoDia: HorarioDoDia,
  intercorrenciasDoDia: Intercorrencia[],
  inicioLocal: string,
  fimLocal?: string,
): Disponibilidade {
  if (horarioDoDia.definido) {
    if (horarioDoDia.fechado || !horarioDoDia.abertura || !horarioDoDia.fechamento) {
      return { aberto: false, motivo: { tipo: 'fora_do_horario', horario: null } }
    }
    const dentro =
      fimLocal === undefined
        ? inicioLocal >= horarioDoDia.abertura && inicioLocal < horarioDoDia.fechamento
        : inicioLocal >= horarioDoDia.abertura && fimLocal <= horarioDoDia.fechamento && inicioLocal < fimLocal
    if (!dentro) {
      return { aberto: false, motivo: { tipo: 'fora_do_horario', horario: horarioDoIntervalo(horarioDoDia) } }
    }
  }

  for (const intercorrencia of intercorrenciasDoDia) {
    if (intercorrencia.reaberta) continue
    if (intercorrencia.diaInteiro) {
      return { aberto: false, motivo: { tipo: 'intercorrencia', intercorrencia } }
    }
    const { horaInicio, horaFim } = intercorrencia
    if (!horaInicio || !horaFim) continue
    const intercepta =
      fimLocal === undefined
        ? inicioLocal >= horaInicio && inicioLocal < horaFim
        : horaInicio < fimLocal && inicioLocal < horaFim
    if (intercepta) {
      return { aberto: false, motivo: { tipo: 'intercorrencia', intercorrencia } }
    }
  }

  return ABERTO
}

/** Versão em lote para listagens: uma query de horários e uma de intercorrências para todos os ids. */
export async function listarAbertos(
  lavaRapidoIds: string[],
  inicio: Date,
  fim?: Date,
): Promise<Map<string, Disponibilidade>> {
  const resultado = new Map<string, Disponibilidade>()
  if (lavaRapidoIds.length === 0) return resultado

  const local = partesLocais(inicio)
  const localFim = fim ? partesLocais(fim) : undefined

  const [horarios, intercorrencias] = await Promise.all([
    prisma.horarioFuncionamento.findMany({
      where: { lavaRapidoId: { in: lavaRapidoIds }, diaSemana: local.diaSemana },
    }),
    prisma.intercorrencia.findMany({
      where: { lavaRapidoId: { in: lavaRapidoIds }, data: local.data, reaberta: false },
    }),
  ])
  const horarioPorId = new Map(horarios.map((horario) => [horario.lavaRapidoId, paraHorarioDia(horario)]))
  const intercorrenciasPorId = new Map<string, Intercorrencia[]>()
  for (const intercorrencia of intercorrencias) {
    const lista = intercorrenciasPorId.get(intercorrencia.lavaRapidoId) ?? []
    lista.push(intercorrencia)
    intercorrenciasPorId.set(intercorrencia.lavaRapidoId, lista)
  }

  for (const id of lavaRapidoIds) {
    const horarioDoDia = horarioPorId.get(id) ?? horarioNaoDefinido(local.diaSemana)
    // Intervalo que atravessa a meia-noite local: tratado como fechado (fora do escopo do I19).
    if (localFim && localFim.data !== local.data) {
      resultado.set(id, {
        aberto: false,
        motivo: { tipo: 'fora_do_horario', horario: horarioDoDia.fechado ? null : horarioDoIntervalo(horarioDoDia) },
      })
      continue
    }
    resultado.set(id, avaliarDisponibilidade(horarioDoDia, intercorrenciasPorId.get(id) ?? [], local.hora, localFim?.hora))
  }
  return resultado
}

/**
 * O lava-rápido atende o intervalo [inicio, fim)? Com `fim` omitido, verifica só o instante `inicio`.
 * Considera: horário de funcionamento do dia (hora local, FUSO_LAVA_RAPIDOS) e
 * intercorrências não reabertas (dia inteiro, ou parcial que intercepta o intervalo).
 * Lava-rápido sem horário cadastrado = sem restrição de horário (só intercorrências).
 */
export async function estaAberto(lavaRapidoId: string, inicio: Date, fim?: Date): Promise<Disponibilidade> {
  const mapa = await listarAbertos([lavaRapidoId], inicio, fim)
  return mapa.get(lavaRapidoId) ?? ABERTO
}

/** Horário do dia local de `data` (para mensagens e para o app mostrar "hoje: 08:00–18:00"). */
export async function getHorarioDoDia(lavaRapidoId: string, data: Date): Promise<HorarioDoDia> {
  const { diaSemana } = partesLocais(data)
  const registro = await prisma.horarioFuncionamento.findUnique({
    where: { lavaRapidoId_diaSemana: { lavaRapidoId, diaSemana } },
  })
  const { diaSemana: _dia, ...horario } = registro ? paraHorarioDia(registro) : horarioNaoDefinido(diaSemana)
  return horario
}
