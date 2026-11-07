/**
 * @typedef {Object} Intercorrencia
 * @property {string} id
 * @property {string} data - formato YYYY-MM-DD
 * @property {string} motivo
 * @property {boolean} diaInteiro
 * @property {string} [horaInicio] - formato HH:mm, só quando diaInteiro é false
 * @property {string} [horaFim] - formato HH:mm, só quando diaInteiro é false
 * @property {boolean} reaberta - o dono já reabriu o lava-rápido: o fechamento deixou de valer
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
    reaberta: Boolean(raw.reaberta),
    ...(diaInteiro ? {} : { horaInicio: raw.horaInicio ?? '', horaFim: raw.horaFim ?? '' }),
  }
}

/**
 * Fechamentos que ainda valem na data "YYYY-MM-DD" (os reabertos ficam de fora).
 * @param {Intercorrencia[]} intercorrencias
 * @param {string | null} data
 * @returns {Intercorrencia[]}
 */
export function intercorrenciasAtivasDoDia(intercorrencias, data) {
  return intercorrencias.filter((item) => item.data === data && !item.reaberta)
}
