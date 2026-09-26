import { prisma } from '../../config/prisma.js'
import type { IntercorrenciaInput } from './intercorrencias.validation.js'

export function listIntercorrencias(lavaRapidoId?: string) {
  return prisma.intercorrencia.findMany({
    where: lavaRapidoId ? { lavaRapidoId } : undefined,
  })
}

export function createIntercorrencia(input: IntercorrenciaInput) {
  return prisma.intercorrencia.create({ data: input })
}
