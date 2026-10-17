export const LAVA_RAPIDOS_ROUTES = {
  /** `horario` (I9): ISO com offset; com ele o backend devolve só os abertos naquele instante. */
  list: (horario?: string | null) =>
    '/lavaRapidos' + (horario ? `?horario=${encodeURIComponent(horario)}` : ''),
  detail: (id: string) => `/lavaRapidos/${id}`,
}
