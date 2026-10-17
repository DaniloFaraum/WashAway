/**
 * @typedef {'pendente' | 'aprovada' | 'recusada' | 'cancelada'} StatusSolicitacaoExclusao
 */

/**
 * @typedef {Object} SolicitacaoExclusao
 * @property {string} id
 * @property {StatusSolicitacaoExclusao} status
 * @property {string | null} motivo
 * @property {string | null} observacao  Observação da equipe ao recusar.
 * @property {string} criadoEm  ISO
 * @property {string | null} decididoEm  ISO
 */

export const MOTIVO_MAXIMO = 500

/**
 * @param {any} raw
 * @returns {SolicitacaoExclusao}
 */
export function normalizeSolicitacaoExclusao(raw) {
  return {
    id: String(raw.id),
    status: raw.status,
    motivo: raw.motivo ?? null,
    observacao: raw.observacao ?? null,
    criadoEm: raw.criadoEm,
    decididoEm: raw.decididoEm ?? null,
  }
}
