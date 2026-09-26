/**
 * @typedef {Object} IntercorrenciaAtiva
 * @property {string} id
 * @property {string} motivo
 * @property {boolean} diaInteiro
 * @property {string | null} horaInicio
 * @property {string | null} horaFim
 */

/**
 * @typedef {Object} LavaRapido
 * @property {string} id
 * @property {string} name
 * @property {string | null} address
 * @property {boolean} isOpen
 * @property {IntercorrenciaAtiva | null} intercorrenciaAtiva
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
    isOpen: Boolean(raw.isOpen),
    intercorrenciaAtiva: raw.intercorrenciaAtiva ?? null,
  }
}
