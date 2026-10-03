export const SERVICOS_ROUTES = {
  list: (lavaRapidoId) => `/servicos${lavaRapidoId ? `?lavaRapidoId=${encodeURIComponent(lavaRapidoId)}` : ''}`,
  create: '/servicos',
  detail: (id) => `/servicos/${id}`,
  itens: '/itensServico',
}
