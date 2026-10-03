export interface IntercorrenciaInput {
  lavaRapidoId: string
  data: string
  motivo: string
  diaInteiro: boolean
  horaInicio?: string
  horaFim?: string
}

export function parseIntercorrenciaInput(body: unknown): IntercorrenciaInput | null {
  if (typeof body !== 'object' || body === null) return null
  const { lavaRapidoId, data, motivo, diaInteiro, horaInicio, horaFim } = body as Record<string, unknown>

  if (typeof lavaRapidoId !== 'string' || lavaRapidoId === '') return null
  if (typeof data !== 'string' || data === '') return null
  if (typeof motivo !== 'string' || motivo === '') return null
  if (typeof diaInteiro !== 'boolean') return null

  if (diaInteiro) {
    if (horaInicio !== undefined || horaFim !== undefined) return null
    return { lavaRapidoId, data, motivo, diaInteiro }
  }

  if (typeof horaInicio !== 'string' || horaInicio === '') return null
  if (typeof horaFim !== 'string' || horaFim === '') return null
  return { lavaRapidoId, data, motivo, diaInteiro, horaInicio, horaFim }
}
