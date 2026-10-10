export const SERVICOS_ROUTES = {
  // Leitura pública (a mesma do app do cliente) — filtra pela empresa da sessão.
  list: (lavaRapidoId) => `/servicos${lavaRapidoId ? `?lavaRapidoId=${encodeURIComponent(lavaRapidoId)}` : ''}`,
  // Escrita: a empresa vem do token (I17), sem lavaRapidoId no body.
  create: '/servicos',
  detail: (id) => `/servicos/${id}`,
  itens: '/itensServico',
}
