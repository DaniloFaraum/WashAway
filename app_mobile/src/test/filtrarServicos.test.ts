import { describe, expect, it } from 'vitest'
import { filtrarServicos, tetoDoFiltro } from '../features/servicos/filtrarServicos'
import type { Servico } from '../features/servicos/service/servicos.model'

function servico(id: string, overrides: Partial<Servico>): Servico {
  return { id, lavaRapidoId: '1', nome: 'Serviço', preco: 50, ativo: true, itens: [], categorias: [], duracaoMinutos: 30, ...overrides }
}

const servicos = [
  servico('1', { nome: 'Lavagem express', preco: 45, duracaoMinutos: 35, categorias: ['Lavagem'], itens: [{ id: 'a', nome: 'Secagem', categoria: 'Lavagem', duracaoMinutos: 10 }] }),
  servico('2', { nome: 'Higienização interna', preco: 220, duracaoMinutos: 180, categorias: ['Limpeza interna'], itens: [{ id: 'b', nome: 'Aspiração', categoria: 'Limpeza interna', duracaoMinutos: 15 }] }),
  servico('3', { nome: 'Vitrificação premium', preco: 1200, duracaoMinutos: 355, categorias: ['Estética e proteção'] }),
]

const semFiltro = { busca: '', categoria: null, precoMin: 0, precoMax: 1200, duracaoMax: 360 }
const ids = (lista: Servico[]) => lista.map((s) => s.id)

describe('filtrarServicos', () => {
  it('sem filtros devolve tudo', () => {
    expect(ids(filtrarServicos(servicos, semFiltro))).toEqual(['1', '2', '3'])
  })

  it('busca no nome do serviço e dos itens, sem acento e sem caixa', () => {
    expect(ids(filtrarServicos(servicos, { ...semFiltro, busca: 'HIGIENIZACAO' }))).toEqual(['2'])
    expect(ids(filtrarServicos(servicos, { ...semFiltro, busca: 'aspiraç' }))).toEqual(['2'])
  })

  it('filtra por categoria, faixa de preço e duração máxima', () => {
    expect(ids(filtrarServicos(servicos, { ...semFiltro, categoria: 'Lavagem' }))).toEqual(['1'])
    expect(ids(filtrarServicos(servicos, { ...semFiltro, precoMin: 100, precoMax: 300 }))).toEqual(['2'])
    expect(ids(filtrarServicos(servicos, { ...semFiltro, duracaoMax: 60 }))).toEqual(['1'])
  })
})

describe('tetoDoFiltro', () => {
  it('arredonda o maior valor para cima no passo, respeitando o mínimo', () => {
    expect(tetoDoFiltro([45, 1200], 50, 300)).toBe(1200)
    expect(tetoDoFiltro([45, 220], 50, 300)).toBe(300)
    expect(tetoDoFiltro([], 15, 120)).toBe(120)
    expect(tetoDoFiltro([355], 15, 120)).toBe(360)
  })
})
