import type { Servico } from './service/servicos.model'

/**
 * Totais do carrinho a partir dos serviços selecionados: preço e duração somam
 * cada serviço (combo) escolhido, pela mesma regra.
 */
export function calcularCarrinho(selecionados: Servico[]) {
  return {
    totalItens: selecionados.length,
    totalPreco: selecionados.reduce((total, servico) => total + servico.preco, 0),
    totalDuracao: selecionados.reduce((total, servico) => total + servico.duracaoMinutos, 0),
  }
}
