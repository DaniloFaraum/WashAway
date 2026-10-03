export const VEICULOS_ROUTES = {
  list: (lavaRapidoId) => `/veiculos${lavaRapidoId ? `?lavaRapidoId=${encodeURIComponent(lavaRapidoId)}` : ''}`,
}
