export const PEDIDOS_ROUTES = {
  list: (lavaRapidoId) => `/pedidos${lavaRapidoId ? `?lavaRapidoId=${encodeURIComponent(lavaRapidoId)}` : ''}`,
  detail: (id) => `/pedidos/${id}`,
}
