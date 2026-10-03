export const TEXTO_ACEITE = 'eu aceito'

/**
 * @typedef {'aguardando_contrato' | 'concluida'} SolicitacaoStatus
 */

/**
 * @typedef {Object} ContratoResumo
 * @property {string} id
 * @property {number} versao
 * @property {string} titulo
 * @property {string} conteudo
 */

/**
 * @typedef {Object} SolicitacaoOnboarding
 * @property {string} id
 * @property {string} name
 * @property {string | null} address
 * @property {string} cnpj
 * @property {SolicitacaoStatus} status
 * @property {ContratoResumo | null} contrato
 */

/**
 * @param {string} texto
 * @returns {boolean}
 */
export function isAceiteValido(texto) {
  return texto.trim().toLowerCase() === TEXTO_ACEITE
}

/**
 * @param {any} raw
 * @returns {SolicitacaoOnboarding}
 */
export function normalizeSolicitacao(raw) {
  return {
    id: String(raw.id),
    name: raw.name ?? '',
    address: raw.address ?? null,
    cnpj: raw.cnpj ?? '',
    status: raw.status ?? 'aguardando_contrato',
    contrato: raw.contrato
      ? {
          id: String(raw.contrato.id),
          versao: Number(raw.contrato.versao) || 0,
          titulo: raw.contrato.titulo ?? '',
          conteudo: raw.contrato.conteudo ?? '',
        }
      : null,
  }
}
