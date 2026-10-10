export const VEICULOS_ROUTES = {
  list: '/clientes/me/veiculos',
  byId: (id: string) => `/clientes/me/veiculos/${encodeURIComponent(id)}`,
}
