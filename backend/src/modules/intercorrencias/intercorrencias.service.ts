import type { Intercorrencia } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { partesLocais } from '../../utils/fusoHorario.js'
import { intercorrenciaQueFecha } from '../horarios/disponibilidade.service.js'
import type { IntercorrenciaInput } from './intercorrencias.validation.js'

export function listIntercorrencias(lavaRapidoId?: string) {
  return prisma.intercorrencia.findMany({
    where: lavaRapidoId ? { lavaRapidoId } : undefined,
  })
}

export function createIntercorrencia(lavaRapidoId: string, input: IntercorrenciaInput) {
  return prisma.intercorrencia.create({ data: { ...input, lavaRapidoId } })
}

/** Reabre só se a intercorrência for da empresa; senão devolve `null`. */
export async function reabrirIntercorrencia(id: string, lavaRapidoId: string) {
  const { count } = await prisma.intercorrencia.updateMany({ where: { id, lavaRapidoId }, data: { reaberta: true } })
  if (count === 0) return null
  return prisma.intercorrencia.findUnique({ where: { id } })
}

export type ResultadoEdicao =
  | { tipo: 'editada'; intercorrencia: Intercorrencia }
  | { tipo: 'nao_encontrada' }
  | { tipo: 'ja_reaberta' }

/**
 * Edita data, motivo e horário de um fechamento da empresa. Um fechamento já
 * reaberto não volta a valer por edição (cadastre um novo): `ja_reaberta`.
 */
export async function editarIntercorrencia(
  id: string,
  lavaRapidoId: string,
  input: IntercorrenciaInput
): Promise<ResultadoEdicao> {
  const { count } = await prisma.intercorrencia.updateMany({
    where: { id, lavaRapidoId, reaberta: false },
    // Dia inteiro limpa o período (undefined não limparia a coluna).
    data: { data: input.data, motivo: input.motivo, diaInteiro: input.diaInteiro, horaInicio: input.horaInicio ?? null, horaFim: input.horaFim ?? null },
  })
  if (count === 0) {
    const existe = await prisma.intercorrencia.findFirst({ where: { id, lavaRapidoId } })
    return existe ? { tipo: 'ja_reaberta' } : { tipo: 'nao_encontrada' }
  }
  const intercorrencia = await prisma.intercorrencia.findUniqueOrThrow({ where: { id } })
  return { tipo: 'editada', intercorrencia }
}

export async function getIntercorrenciaAtiva(
  lavaRapidoId: string,
  agora: Date
): Promise<Intercorrencia | null> {
  // Data e hora no fuso dos lava-rápidos (não UTC nem o fuso do servidor).
  const { data: hoje, hora: horaAtual } = partesLocais(agora)

  const candidatas = await prisma.intercorrencia.findMany({
    where: { lavaRapidoId, data: hoje, reaberta: false },
  })

  // Mesma regra do `estaAberto` (função compartilhada de disponibilidade).
  return intercorrenciaQueFecha(candidatas, horaAtual)
}
