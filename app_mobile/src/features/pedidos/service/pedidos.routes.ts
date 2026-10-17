export const PEDIDOS_ROUTES = {
  // POST com token de cliente (I13).
  create: '/pedidos',
  // Cliente logado (I18).
  meus: '/clientes/me/pedidos',
  meu: (id: string) => `/clientes/me/pedidos/${encodeURIComponent(id)}`,
  marcarVisto: (id: string) => `/clientes/me/pedidos/${encodeURIComponent(id)}/visto`,
  notificacoes: '/clientes/me/notificacoes',
}
