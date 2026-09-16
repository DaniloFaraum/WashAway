/**
 * @typedef {Object} Veiculo
 * @property {string} modelo
 * @property {string} placa
 */

/**
 * @typedef {Object} Pedido
 * @property {string} id
 * @property {Veiculo} veiculo
 * @property {string} servico
 * @property {string} horario
 * @property {'pendente' | 'em_andamento' | 'concluido'} status
 * @property {string[]} fotos
 */

export const PEDIDO_STATUS = {
  pendente: { label: 'Pendente', color: 'warning' },
  em_andamento: { label: 'Em andamento', color: 'info' },
  concluido: { label: 'Concluído', color: 'success' },
}

/**
 * @param {any} raw
 * @returns {Pedido}
 */
export function normalizePedido(raw) {
  return {
    id: String(raw.id),
    veiculo: {
      modelo: raw.veiculo?.modelo ?? '',
      placa: raw.veiculo?.placa ?? '',
    },
    servico: raw.servico ?? '',
    horario: raw.horario ?? '',
    status: raw.status ?? 'pendente',
    fotos: raw.fotos ?? [],
  }
}
