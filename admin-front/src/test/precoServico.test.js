import { describe, expect, it } from 'vitest'
import { PRECO_SERVICO_MAX, erroDoPreco, precoParaNumero, sanitizarPreco } from '../pages/servicos/preco.js'

describe('preço do serviço', () => {
  it('sanitizarPreco deixa só dígitos e um separador, com no máximo 2 casas', () => {
    expect(sanitizarPreco('50')).toBe('50')
    expect(sanitizarPreco('50,5')).toBe('50,5')
    expect(sanitizarPreco('50.555')).toBe('50.55')
    expect(sanitizarPreco('1,2,3')).toBe('1,23')
    expect(sanitizarPreco('R$ 1e3')).toBe('13')
    expect(sanitizarPreco('-10')).toBe('10')
    expect(sanitizarPreco('abc')).toBe('')
  })

  it('precoParaNumero aceita vírgula e devolve 0 para vazio ou inválido', () => {
    expect(precoParaNumero('49,90')).toBe(49.9)
    expect(precoParaNumero('49.9')).toBe(49.9)
    expect(precoParaNumero('')).toBe(0)
    expect(precoParaNumero('.')).toBe(0)
  })

  it('erroDoPreco: zero e acima do teto têm mensagem; o teto e valores comuns passam', () => {
    expect(erroDoPreco(0)).toMatch(/maior que zero/)
    expect(erroDoPreco(PRECO_SERVICO_MAX + 0.01)).toMatch(/máximo/)
    expect(erroDoPreco(99999999)).toMatch(/máximo/)
    expect(erroDoPreco(PRECO_SERVICO_MAX)).toBeNull()
    expect(erroDoPreco(49.9)).toBeNull()
  })
})
