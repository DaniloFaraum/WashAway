/**
 * @typedef {Object} Veiculo
 * @property {string} id
 * @property {string} modelo
 * @property {string} placa
 */

/**
 * @param {any} raw
 * @returns {Veiculo}
 */
export function normalizeVeiculo(raw) {
  return {
    id: String(raw.id),
    modelo: raw.modelo ?? '',
    placa: raw.placa ?? '',
  }
}
