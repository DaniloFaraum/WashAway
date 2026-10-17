export const INTERCORRENCIAS_ROUTES = {
  // Leitura pública (a mesma do app do cliente) — filtra pela empresa da sessão.
  list: (lavaRapidoId) => `/intercorrencias${lavaRapidoId ? `?lavaRapidoId=${encodeURIComponent(lavaRapidoId)}` : ''}`,
  // Escrita: a empresa vem do token (I17), sem lavaRapidoId no body.
  create: '/intercorrencias',
}

export const HORARIOS_ROUTES = {
  // Escrita do horário semanal (I19 parte 2): exige o token; o :id tem de ser a empresa do token (outra = 404).
  update: (lavaRapidoId) => `/lavaRapidos/${encodeURIComponent(lavaRapidoId)}/horarios`,
}
