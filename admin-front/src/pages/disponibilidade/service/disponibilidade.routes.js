export const INTERCORRENCIAS_ROUTES = {
  list: (lavaRapidoId) => `/intercorrencias${lavaRapidoId ? `?lavaRapidoId=${encodeURIComponent(lavaRapidoId)}` : ''}`,
  create: '/intercorrencias',
}
