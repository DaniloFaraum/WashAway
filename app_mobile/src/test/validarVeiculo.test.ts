import { describe, expect, it } from 'vitest'
import { formatarPlaca, isPlacaValida, normalizarPlaca } from '../features/veiculos/placa'
import { validarVeiculo } from '../features/veiculos/validarVeiculo'

const valido = { marca: '', modelo: 'Onix', cor: 'Prata', placa: 'ABC-1234' }

describe('validarVeiculo', () => {
  it('dados válidos (marca vazia é opcional): sem erros', () => {
    expect(validarVeiculo(valido)).toEqual({})
  })

  it('modelo, cor e placa são obrigatórios (só espaços conta como vazio)', () => {
    expect(validarVeiculo({ marca: '', modelo: '  ', cor: '', placa: ' ' })).toEqual({
      modelo: 'Informe o modelo',
      cor: 'Informe a cor',
      placa: 'Informe a placa',
    })
  })

  it.each(['abc-1234', 'ABC1234', 'abc1d23', 'ABC-1D23'])('placa aceita (%s)', (placa) => {
    expect(validarVeiculo({ ...valido, placa })).toEqual({})
  })

  it.each(['AB12345', 'ABCD123', 'ABC123', 'ABC1DD3'])('placa recusada (%s)', (placa) => {
    expect(validarVeiculo({ ...valido, placa })).toEqual({ placa: 'Placa inválida. Use o formato ABC-1234 ou ABC1D23' })
  })

  it('textos acima de 60 caracteres são recusados', () => {
    const longo = 'a'.repeat(61)
    expect(Object.keys(validarVeiculo({ marca: longo, modelo: longo, cor: longo, placa: 'ABC1234' })).sort()).toEqual([
      'cor',
      'marca',
      'modelo',
    ])
  })
})

describe('placa', () => {
  it('normaliza sem hífen/espaços e em maiúsculas', () => {
    expect(normalizarPlaca(' abc-1d23 ')).toBe('ABC1D23')
  })

  it('isPlacaValida segue a mesma regra do back-end', () => {
    expect(isPlacaValida('abc-1234')).toBe(true)
    expect(isPlacaValida('ABCD123')).toBe(false)
  })

  it('formata a antiga com hífen e deixa a Mercosul como está', () => {
    expect(formatarPlaca('ABC1234')).toBe('ABC-1234')
    expect(formatarPlaca('abc1d23')).toBe('ABC1D23')
  })
})
