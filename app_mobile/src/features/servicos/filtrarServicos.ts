import type { Servico } from './service/servicos.model'

export interface FiltrosServicos {
  busca: string
  categoria: string | null
  precoMin: number
  precoMax: number
  duracaoMax: number
}

function normalizarTexto(valor: string) {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR')
}

/**
 * Filtros da tela de serviços: busca (nome do serviço e dos itens, sem acento),
 * categoria (o serviço contém algum item dela), faixa de preço e duração máxima.
 */
export function filtrarServicos(servicos: Servico[], filtros: FiltrosServicos): Servico[] {
  const busca = normalizarTexto(filtros.busca.trim())
  return servicos.filter((servico) => {
    const texto = normalizarTexto([servico.nome, ...servico.itens.map((item) => item.nome)].join(' '))
    return (
      (!busca || texto.includes(busca)) &&
      (!filtros.categoria || servico.categorias.includes(filtros.categoria)) &&
      servico.preco >= filtros.precoMin &&
      servico.preco <= filtros.precoMax &&
      servico.duracaoMinutos <= filtros.duracaoMax
    )
  })
}

/** Teto de um slider: maior valor dos dados arredondado pra cima no passo, nunca abaixo do mínimo. */
export function tetoDoFiltro(valores: number[], passo: number, minimo: number) {
  const maior = Math.max(0, ...valores)
  return Math.max(minimo, Math.ceil(maior / passo) * passo)
}
