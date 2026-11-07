// Regras do campo "Preço" do serviço (refinamento T4 e T6). O backend valida o
// mesmo (`servicos.validation.ts`): teto de R$ 5.000,00 e no máximo 2 casas decimais.

// Mesmo valor de `PRECO_SERVICO_MAX` no backend.
export const PRECO_SERVICO_MAX = 5000

/**
 * O que a pessoa digita: só dígitos e um separador decimal (vírgula ou ponto),
 * com no máximo 2 casas — a terceira casa simplesmente não entra, em vez de ser
 * cortada em silêncio no servidor. "50.555" → "50.55"; "1,2,3" → "1,23".
 * @param {string} texto
 * @returns {string}
 */
export function sanitizarPreco(texto) {
  const limpo = texto.replace(/[^\d.,]/g, '')
  const posicao = limpo.search(/[.,]/)
  if (posicao === -1) return limpo
  const inteiro = limpo.slice(0, posicao)
  const decimais = limpo.slice(posicao + 1).replace(/[.,]/g, '').slice(0, 2)
  return `${inteiro}${limpo[posicao]}${decimais}`
}

/**
 * "49,90" → 49.9; vazio ou inválido → 0.
 * @param {string} texto
 * @returns {number}
 */
export function precoParaNumero(texto) {
  const numero = Number(texto.replace(',', '.'))
  return Number.isFinite(numero) ? numero : 0
}

/**
 * Mensagem de erro do preço digitado, ou `null` se estiver ok.
 * @param {number} numero
 * @returns {string | null}
 */
export function erroDoPreco(numero) {
  if (!(numero > 0)) return 'Informe um preço maior que zero.'
  if (numero > PRECO_SERVICO_MAX) return 'O preço máximo de um serviço é R$ 5.000,00.'
  return null
}
