/**
 * @typedef {Object} Intercorrencia
 * @property {string} id
 * @property {string} data - formato YYYY-MM-DD
 * @property {string} motivo
 * @property {boolean} diaInteiro
 * @property {string} [horaInicio] - formato HH:mm, só quando diaInteiro é false
 * @property {string} [horaFim] - formato HH:mm, só quando diaInteiro é false
 */

/**
 * @param {any} raw
 * @returns {Intercorrencia}
 */
export function normalizeIntercorrencia(raw) {
  const diaInteiro = Boolean(raw.diaInteiro)
  return {
    id: String(raw.id),
    data: raw.data ?? '',
    motivo: raw.motivo ?? '',
    diaInteiro,
    ...(diaInteiro ? {} : { horaInicio: raw.horaInicio ?? '', horaFim: raw.horaFim ?? '' }),
  }
}
