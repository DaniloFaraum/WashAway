import { describe, expect, it } from 'vitest'
import { validarVeiculo } from './veiculosCliente.validation.js'

describe('validarVeiculo', () => {
  it('dados válidos: limpa os textos, normaliza a placa e marca vazia vira null', () => {
    const { erros, dados } = validarVeiculo({ marca: '  ', modelo: ' Onix ', cor: ' Prata ', placa: 'abc-1234' })

    expect(erros).toEqual({})
    expect(dados).toEqual({ marca: null, modelo: 'Onix', cor: 'Prata', placa: 'ABC1234' })
  })

  it('marca é opcional e, quando vem, é mantida com trim', () => {
    expect(validarVeiculo({ marca: ' Chevrolet ', modelo: 'Onix', cor: 'Prata', placa: 'ABC1D23' }).dados?.marca).toBe('Chevrolet')
    expect(validarVeiculo({ modelo: 'Onix', cor: 'Prata', placa: 'ABC1D23' }).dados?.marca).toBeNull()
  })

  it('body ausente: erro em modelo, cor e placa (marca não)', () => {
    expect(Object.keys(validarVeiculo(undefined).erros).sort()).toEqual(['cor', 'modelo', 'placa'])
  })

  it('placa em formato inválido', () => {
    expect(validarVeiculo({ modelo: 'Onix', cor: 'Prata', placa: 'AB12345' }).erros).toEqual({
      placa: 'Placa inválida (use o formato ABC-1234 ou ABC1D23)',
    })
  })

  it('textos longos demais e marca não-string são inválidos', () => {
    const { erros } = validarVeiculo({ marca: 10, modelo: 'a'.repeat(61), cor: 'Prata', placa: 'ABC1234' })
    expect(Object.keys(erros).sort()).toEqual(['marca', 'modelo'])
  })
})
