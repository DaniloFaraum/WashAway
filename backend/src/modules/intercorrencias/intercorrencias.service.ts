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

export function createIntercorrencia(input: IntercorrenciaInput) {
  return prisma.intercorrencia.create({ data: input })
}

export function reabrirIntercorrencia(id: string) {
  return prisma.intercorrencia.update({ where: { id }, data: { reaberta: true } })
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
