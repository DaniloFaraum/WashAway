/**
 * Veículo de um pedido da empresa (I13: relação Pedido → Veiculo no backend).
 * @typedef {Object} Veiculo
 * @property {string} id
 * @property {string | null} marca
 * @property {string} modelo
 * @property {string} cor
 * @property {string} placa
 */

/**
 * @param {any} raw
 * @returns {Veiculo}
 */
export function normalizeVeiculo(raw) {
  return {
    id: String(raw.id),
    marca: raw.marca ?? null,
    modelo: raw.modelo ?? '',
    cor: raw.cor ?? '',
    placa: raw.placa ?? '',
  }
}
