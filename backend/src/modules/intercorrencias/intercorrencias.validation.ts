/** Dados de uma intercorrência vindos do painel. A empresa vem do token (I17), não do body. */
export interface IntercorrenciaInput {
  data: string
  motivo: string
  diaInteiro: boolean
  horaInicio?: string
  horaFim?: string
}

/** Valida o body; um `lavaRapidoId` no body é ignorado (a empresa vem do token). */
export function parseIntercorrenciaInput(body: unknown): IntercorrenciaInput | null {
  if (typeof body !== 'object' || body === null) return null
  const { data, motivo, diaInteiro, horaInicio, horaFim } = body as Record<string, unknown>

  if (typeof data !== 'string' || data === '') return null
  if (typeof motivo !== 'string' || motivo === '') return null
  if (typeof diaInteiro !== 'boolean') return null

  if (diaInteiro) {
    if (horaInicio !== undefined || horaFim !== undefined) return null
    return { data, motivo, diaInteiro }
  }

  if (typeof horaInicio !== 'string' || horaInicio === '') return null
  if (typeof horaFim !== 'string' || horaFim === '') return null
  return { data, motivo, diaInteiro, horaInicio, horaFim }
}
