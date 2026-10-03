/**
 * Item do catálogo global (serviço "atômico" — a loja não cria itens).
 * @typedef {Object} ItemServico
 * @property {string} id
 * @property {string} nome
 * @property {string} descricao
 * @property {string} categoria
 * @property {number} duracaoMinutos duração estimada do item
 */

/**
 * Serviço da loja = combo de itens do catálogo.
 * @typedef {Object} Servico
 * @property {string} id
 * @property {string} nome
 * @property {number} preco
 * @property {boolean} ativo
 * @property {{ id: string, nome: string, categoria: string, duracaoMinutos: number }[]} itens
 * @property {string[]} categorias derivadas (distintas) dos itens
 * @property {number} duracaoMinutos derivada: soma da duração dos itens
 */

/**
 * Duração de um combo = soma dos seus itens (mesma regra do backend). Usada
 * também pelo diálogo para mostrar a duração enquanto os itens são marcados.
 * @param {{ duracaoMinutos: number }[]} itens
 * @returns {number}
 */
export function somarDuracao(itens) {
  return itens.reduce((total, item) => total + item.duracaoMinutos, 0)
}

/**
 * @param {any} raw
 * @returns {Servico}
 */
export function normalizeServico(raw) {
  const itens = (raw.itens ?? []).map((item) => ({
    id: String(item.id),
    nome: item.nome ?? '',
    categoria: item.categoria ?? '',
    duracaoMinutos: Number(item.duracaoMinutos) || 0,
  }))
  return {
    id: String(raw.id),
    nome: raw.nome ?? '',
    preco: Number(raw.preco) || 0,
    ativo: Boolean(raw.ativo),
    itens,
    categorias: raw.categorias ?? [...new Set(itens.map((item) => item.categoria))],
    duracaoMinutos: somarDuracao(itens),
  }
}

/**
 * @param {any} raw
 * @returns {ItemServico}
 */
export function normalizeItemServico(raw) {
  return {
    id: String(raw.id),
    nome: raw.nome ?? '',
    descricao: raw.descricao ?? '',
    categoria: raw.categoria ?? '',
    duracaoMinutos: Number(raw.duracaoMinutos) || 0,
  }
}
