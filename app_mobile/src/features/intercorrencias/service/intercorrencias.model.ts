export interface Intercorrencia {
  id: string
  lavaRapidoId: string
  data: string
  motivo: string
  diaInteiro: boolean
  horaInicio: string | null
  horaFim: string | null
}

export function normalizeIntercorrencia(raw: any): Intercorrencia {
  return {
    id: String(raw.id),
    lavaRapidoId: String(raw.lavaRapidoId),
    data: raw.data ?? '',
    motivo: raw.motivo ?? '',
    diaInteiro: Boolean(raw.diaInteiro),
    horaInicio: raw.horaInicio ?? null,
    horaFim: raw.horaFim ?? null,
  }
}
