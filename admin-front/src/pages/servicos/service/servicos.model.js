/**
 * @typedef {Object} Servico
 * @property {string} id
 * @property {string} nome
 * @property {string} categoria
 * @property {number} preco
 * @property {boolean} ativo
 */

/**
 * @param {any} raw
 * @returns {Servico}
 */
export function normalizeServico(raw) {
  return {
    id: String(raw.id),
    nome: raw.nome ?? '',
    categoria: raw.categoria ?? '',
    preco: Number(raw.preco) || 0,
    ativo: Boolean(raw.ativo),
  }
}
