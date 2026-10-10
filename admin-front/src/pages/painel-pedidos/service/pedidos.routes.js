export const PEDIDOS_ROUTES = {
  // A empresa vem do token (I17), não de ?lavaRapidoId=.
  list: '/pedidos',
  detail: (id) => `/pedidos/${id}`,
}
