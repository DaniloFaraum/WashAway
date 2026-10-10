export const INTERCORRENCIAS_ROUTES = {
  // Leitura pública (a mesma do app do cliente) — filtra pela empresa da sessão.
  list: (lavaRapidoId) => `/intercorrencias${lavaRapidoId ? `?lavaRapidoId=${encodeURIComponent(lavaRapidoId)}` : ''}`,
  // Escrita: a empresa vem do token (I17), sem lavaRapidoId no body.
  create: '/intercorrencias',
}
