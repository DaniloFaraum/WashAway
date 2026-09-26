export interface Servico {
  id: string
  lavaRapidoId: string
  nome: string
  categoria: string
  preco: number
  ativo: boolean
}

export function normalizeServico(raw: any): Servico {
  return {
    id: String(raw.id),
    lavaRapidoId: String(raw.lavaRapidoId),
    nome: raw.nome ?? '',
    categoria: raw.categoria ?? '',
    preco: Number(raw.preco) || 0,
    ativo: Boolean(raw.ativo),
  }
}
