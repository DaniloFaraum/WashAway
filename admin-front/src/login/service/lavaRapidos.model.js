/**
 * @typedef {Object} LavaRapido
 * @property {string} id
 * @property {string} name
 * @property {string | null} address
 */

/**
 * @param {any} raw
 * @returns {LavaRapido}
 */
export function normalizeLavaRapido(raw) {
  return {
    id: String(raw.id),
    name: raw.name ?? '',
    address: raw.address ?? null,
  }
}
