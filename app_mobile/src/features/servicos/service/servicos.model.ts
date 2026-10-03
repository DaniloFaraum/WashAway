export interface ItemDoServico {
  id: string
  nome: string
  categoria: string
  duracaoMinutos: number
}

// Serviço da loja = combo de itens do catálogo global; as categorias e a
// duração são derivadas dos itens (o serviço não tem nenhuma das duas própria).
export interface Servico {
  id: string
  lavaRapidoId: string
  nome: string
  preco: number
  ativo: boolean
  itens: ItemDoServico[]
  categorias: string[]
  duracaoMinutos: number
}

export function normalizeServico(raw: any): Servico {
  const itens: ItemDoServico[] = (raw.itens ?? []).map((item: any) => ({
    id: String(item.id),
    nome: item.nome ?? '',
    categoria: item.categoria ?? '',
    duracaoMinutos: Number(item.duracaoMinutos) || 0,
  }))
  return {
    id: String(raw.id),
    lavaRapidoId: String(raw.lavaRapidoId),
    nome: raw.nome ?? '',
    preco: Number(raw.preco) || 0,
    ativo: Boolean(raw.ativo),
    itens,
    categorias: raw.categorias ?? [...new Set(itens.map((item) => item.categoria))],
    duracaoMinutos:
      raw.duracaoMinutos != null
        ? Number(raw.duracaoMinutos) || 0
        : itens.reduce((total, item) => total + item.duracaoMinutos, 0),
  }
}
