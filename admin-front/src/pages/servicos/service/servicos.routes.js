export const SERVICOS_ROUTES = {
  list: (lavaRapidoId) => `/servicos${lavaRapidoId ? `?lavaRapidoId=${encodeURIComponent(lavaRapidoId)}` : ''}`,
  detail: (id) => `/servicos/${id}`,
}
