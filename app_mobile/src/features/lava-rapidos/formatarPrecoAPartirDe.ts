/**
 * Texto do preço "a partir de" de um lava-rápido (card da Home e marcador do mapa).
 * `null` = a loja não tem nenhum serviço ativo.
 */
export function formatarPrecoAPartirDe(price: number | null): string {
  if (price == null) return 'Sem serviços disponíveis'
  return `A partir de R$ ${price.toFixed(2).replace('.', ',')}`
}
