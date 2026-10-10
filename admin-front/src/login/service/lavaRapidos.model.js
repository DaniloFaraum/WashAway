/**
 * @typedef {Object} IntercorrenciaAtiva
 * @property {string} id
 * @property {string} motivo
 * @property {boolean} diaInteiro
 * @property {string | null} horaInicio
 * @property {string | null} horaFim
 */

/**
 * @typedef {Object} HorarioDia
 * @property {number} diaSemana - 0 = domingo … 6 = sábado
 * @property {boolean} fechado
 * @property {string | null} abertura - formato HH:mm
 * @property {string | null} fechamento - formato HH:mm
 * @property {boolean} definido - false quando o dia não tem horário cadastrado
 */

/**
 * @typedef {Object} LavaRapido
 * @property {string} id
 * @property {string} name
 * @property {string | null} address
 * @property {boolean} isOpen
 * @property {IntercorrenciaAtiva | null} intercorrenciaAtiva
 * @property {boolean} foraDoHorario - fechado agora por estar fora do horário de funcionamento
 * @property {HorarioDia[]} horarios
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
    foraDoHorario: Boolean(raw.foraDoHorario),
    horarios: (raw.horarios ?? []).map(normalizeHorarioDia),
  }
}

/**
 * @param {any} raw
 * @returns {HorarioDia}
 */
function normalizeHorarioDia(raw) {
  return {
    diaSemana: Number(raw.diaSemana),
    fechado: Boolean(raw.fechado),
    abertura: raw.abertura ?? null,
    fechamento: raw.fechamento ?? null,
    definido: raw.definido !== false,
  }
}
