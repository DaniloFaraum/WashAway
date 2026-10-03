import { describe, expect, it } from 'vitest'
import { calcularCarrinho } from '../features/servicos/calcularCarrinho'
import { normalizeServico, type Servico } from '../features/servicos/service/servicos.model'
import { normalizeLavaRapido } from '../features/lava-rapidos/service/lavaRapidos.model'
import { formatarPrecoAPartirDe } from '../features/lava-rapidos/formatarPrecoAPartirDe'
import { formatarDuracao } from '../utils/formatarDuracao'

function servico(overrides: Partial<Servico>): Servico {
  return {
    id: '1',
    lavaRapidoId: '1',
    nome: 'Serviço',
    preco: 10,
    ativo: true,
    itens: [],
    categorias: [],
    duracaoMinutos: 0,
    ...overrides,
  }
}

describe('calcularCarrinho', () => {
  it('zera tudo quando nada está selecionado', () => {
    expect(calcularCarrinho([])).toEqual({ totalItens: 0, totalPreco: 0, totalDuracao: 0 })
  })

  it('soma preço e duração de cada serviço selecionado', () => {
    const totais = calcularCarrinho([
      servico({ preco: 40, duracaoMinutos: 30 }),
      servico({ preco: 70, duracaoMinutos: 75 }),
    ])

    expect(totais).toEqual({ totalItens: 2, totalPreco: 110, totalDuracao: 105 })
  })
})

describe('formatarDuracao', () => {
  it.each([
    [40, '40 min'],
    [60, '1h'],
    [90, '1h 30min'],
    [180, '3h'],
  ])('%i minutos → %s', (minutos, esperado) => {
    expect(formatarDuracao(minutos)).toBe(esperado)
  })
})

describe('normalizeServico', () => {
  it('usa a duração do combo vinda da API', () => {
    expect(normalizeServico({ id: 1, lavaRapidoId: 1, duracaoMinutos: 75, itens: [] }).duracaoMinutos).toBe(75)
  })

  it('sem duração do combo na resposta, soma a dos itens', () => {
    const normalizado = normalizeServico({
      id: 1,
      lavaRapidoId: 1,
      itens: [
        { id: 'a', nome: 'Lavagem externa', categoria: 'Lavagem', duracaoMinutos: 20 },
        { id: 'b', nome: 'Secagem', categoria: 'Secagem e acabamento', duracaoMinutos: 10 },
      ],
    })

    expect(normalizado.duracaoMinutos).toBe(30)
  })
})

describe('preço "a partir de" do lava-rápido', () => {
  it('normalizeLavaRapido mantém price null quando a loja não tem serviço ativo', () => {
    expect(normalizeLavaRapido({ id: 1, price: null }).price).toBeNull()
    expect(normalizeLavaRapido({ id: 1, price: 40 }).price).toBe(40)
  })

  it('formatarPrecoAPartirDe mostra o valor ou "Sem serviços disponíveis"', () => {
    expect(formatarPrecoAPartirDe(40)).toBe('A partir de R$ 40,00')
    expect(formatarPrecoAPartirDe(null)).toBe('Sem serviços disponíveis')
  })
})
