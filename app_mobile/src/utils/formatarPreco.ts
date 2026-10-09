/**
 * Formata um valor em reais para exibição: 40 → "R$ 40,00".
 */
export function formatarPreco(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}
