import { describe, expect, it } from 'vitest'
import { NOME_SERVICO_MAX, PRECO_SERVICO_MAX, validarDadosServico } from './servicos.validation.js'

describe('validarDadosServico — preço', () => {
  const base = { nome: 'Combo', itemIds: ['a'] }

  it('aceita preço até o teto, com no máximo 2 casas decimais', () => {
    expect(validarDadosServico({ ...base, preco: 0.01 })).toBeNull()
    expect(validarDadosServico({ ...base, preco: 49.9 })).toBeNull()
    expect(validarDadosServico({ ...base, preco: 110.5 })).toBeNull()
    expect(validarDadosServico({ ...base, preco: PRECO_SERVICO_MAX })).toBeNull()
  })

  it('recusa preço acima do teto', () => {
    expect(validarDadosServico({ ...base, preco: PRECO_SERVICO_MAX + 0.01 })).toMatch(/no máximo/)
    expect(validarDadosServico({ ...base, preco: 99999999 })).toMatch(/no máximo/)
  })

  it('recusa mais de 2 casas decimais', () => {
    expect(validarDadosServico({ ...base, preco: 50.555 })).toMatch(/2 casas/)
    expect(validarDadosServico({ ...base, preco: 0.001 })).toMatch(/2 casas/)
  })

  it('recusa zero, negativo e valor que não é número', () => {
    expect(validarDadosServico({ ...base, preco: 0 })).toMatch(/maior que zero/)
    expect(validarDadosServico({ ...base, preco: -5 })).toMatch(/maior que zero/)
    expect(validarDadosServico({ ...base, preco: '10' })).toMatch(/maior que zero/)
  })

  it('mantém o limite de nome', () => {
    expect(validarDadosServico({ ...base, nome: 'x'.repeat(NOME_SERVICO_MAX + 1), preco: 10 })).toMatch(/até 60/)
  })
})
