import type { HorarioFuncionamento } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import type { HorarioDiaInput } from './horarios.validation.js'

export type HorarioDia = {
  diaSemana: number
  fechado: boolean
  abertura: string | null
  fechamento: string | null
  /** false = dia sem horário cadastrado (sem restrição: só intercorrências fecham). */
  definido: boolean
}

export function horarioNaoDefinido(diaSemana: number): HorarioDia {
  return { diaSemana, fechado: false, abertura: null, fechamento: null, definido: false }
}

export function paraHorarioDia(registro: HorarioFuncionamento): HorarioDia {
  return {
    diaSemana: registro.diaSemana,
    fechado: registro.fechado,
    abertura: registro.abertura,
    fechamento: registro.fechamento,
    definido: true,
  }
}

/** Os 7 dias (0 = domingo … 6 = sábado), sempre nessa ordem; dia não cadastrado vem com `definido: false`. */
export async function listarHorarios(lavaRapidoId: string): Promise<HorarioDia[]> {
  const registros = await prisma.horarioFuncionamento.findMany({ where: { lavaRapidoId } })
  const porDia = new Map(registros.map((registro) => [registro.diaSemana, registro]))
  return Array.from({ length: 7 }, (_, diaSemana) => {
    const registro = porDia.get(diaSemana)
    return registro ? paraHorarioDia(registro) : horarioNaoDefinido(diaSemana)
  })
}

/**
 * Substitui o horário semanal inteiro do lava-rápido (os 7 dias, já validados por
 * `parseHorariosInput`) numa transação e devolve os 7 dias como o `GET`.
 */
export async function substituirHorarios(lavaRapidoId: string, dias: HorarioDiaInput[]): Promise<HorarioDia[]> {
  await prisma.$transaction([
    prisma.horarioFuncionamento.deleteMany({ where: { lavaRapidoId } }),
    prisma.horarioFuncionamento.createMany({ data: dias.map((dia) => ({ lavaRapidoId, ...dia })) }),
  ])
  return listarHorarios(lavaRapidoId)
}
