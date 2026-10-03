import { describe, expect, it } from 'vitest'
import { filtrarServicosAtivos } from '../features/servicos/useServicos'
import type { Servico } from '../features/servicos/service/servicos.model'

function servico(overrides: Partial<Servico>): Servico {
  return {
    id: '1',
    lavaRapidoId: '1',
    nome: 'Serviço',
    preco: 10,
    ativo: true,
    itens: [{ id: 'it1', nome: 'Lavagem externa', categoria: 'Lavagem', duracaoMinutos: 20 }],
    categorias: ['Lavagem'],
    duracaoMinutos: 20,
    ...overrides,
  }
}

describe('filtrarServicosAtivos', () => {
  it('mantém só os serviços com ativo: true', () => {
    const servicos = [
      servico({ id: '1', ativo: true }),
      servico({ id: '2', ativo: false }),
      servico({ id: '3', ativo: true }),
    ]

    expect(filtrarServicosAtivos(servicos).map((s) => s.id)).toEqual(['1', '3'])
  })

  it('retorna vazio quando nenhum serviço está ativo', () => {
    const servicos = [servico({ id: '1', ativo: false })]

    expect(filtrarServicosAtivos(servicos)).toEqual([])
  })
})
