import type { Intercorrencia } from '@prisma/client'
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

export function reabrirIntercorrencia(id: string) {
  return prisma.intercorrencia.update({ where: { id }, data: { reaberta: true } })
}

function formatarData(agora: Date): string {
  return agora.toISOString().slice(0, 10)
}

function formatarHora(agora: Date): string {
  return agora.toTimeString().slice(0, 5)
}

/** Uma intercorrência (não reaberta) "fecha agora" se for de dia inteiro, ou se
 * a hora atual estiver dentro do intervalo horaInicio–horaFim. */
function estaAtivaAgora(intercorrencia: Intercorrencia, horaAtual: string): boolean {
  if (intercorrencia.diaInteiro) return true
  if (!intercorrencia.horaInicio || !intercorrencia.horaFim) return false
  return horaAtual >= intercorrencia.horaInicio && horaAtual < intercorrencia.horaFim
}

export async function getIntercorrenciaAtiva(
  lavaRapidoId: string,
  agora: Date
): Promise<Intercorrencia | null> {
  const hoje = formatarData(agora)
  const horaAtual = formatarHora(agora)

  const candidatas = await prisma.intercorrencia.findMany({
    where: { lavaRapidoId, data: hoje, reaberta: false },
  })

  return candidatas.find((item) => estaAtivaAgora(item, horaAtual)) ?? null
}

export async function listLavaRapidoIdsComIntercorrenciaAtiva(
  agora: Date
): Promise<Map<string, Intercorrencia>> {
  const hoje = formatarData(agora)
  const horaAtual = formatarHora(agora)

  const candidatas = await prisma.intercorrencia.findMany({
    where: { data: hoje, reaberta: false },
  })

  const mapa = new Map<string, Intercorrencia>()
  for (const item of candidatas) {
    if (!mapa.has(item.lavaRapidoId) && estaAtivaAgora(item, horaAtual)) {
      mapa.set(item.lavaRapidoId, item)
    }
  }
  return mapa
}
