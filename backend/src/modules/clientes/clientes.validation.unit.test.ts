import { describe, expect, it } from 'vitest'
import { normalizarEmail, validarCadastroCliente } from './clientes.validation.js'

describe('validarCadastroCliente', () => {
  it('dados válidos: sem erros e com nome/e-mail limpos', () => {
    const { erros, dados } = validarCadastroCliente({ nome: '  Ana ', email: ' Ana@X.com ', senha: '123456' })

    expect(erros).toEqual({})
    expect(dados).toEqual({ nome: 'Ana', email: 'ana@x.com', senha: '123456' })
  })

  it('nome só com espaços é obrigatório', () => {
    expect(validarCadastroCliente({ nome: '   ', email: 'a@b.co', senha: '123456' }).erros).toEqual({
      nome: 'Nome é obrigatório',
    })
  })

  it('e-mail ausente é obrigatório', () => {
    expect(validarCadastroCliente({ nome: 'Ana', senha: '123456' }).erros).toEqual({ email: 'E-mail é obrigatório' })
  })

  it.each(['ana', 'ana@', 'ana@x', 'a na@x.com', '@x.com'])('e-mail com formato inválido (%s)', (email) => {
    expect(validarCadastroCliente({ nome: 'Ana', email, senha: '123456' }).erros).toEqual({ email: 'E-mail inválido' })
  })

  it('senha com menos de 6 caracteres', () => {
    const { erros, dados } = validarCadastroCliente({ nome: 'Ana', email: 'a@b.co', senha: '12345' })

    expect(Object.keys(erros)).toEqual(['senha'])
    expect(dados).toBeUndefined()
  })

  it('senha não-string é inválida', () => {
    expect(Object.keys(validarCadastroCliente({ nome: 'Ana', email: 'a@b.co', senha: 1234567 }).erros)).toEqual(['senha'])
  })

  it('senha acima de 72 bytes (limite do bcrypt) é inválida, inclusive com acentos', () => {
    expect(validarCadastroCliente({ nome: 'Ana', email: 'a@b.co', senha: 'a'.repeat(72) }).erros).toEqual({})
    expect(Object.keys(validarCadastroCliente({ nome: 'Ana', email: 'a@b.co', senha: 'a'.repeat(73) }).erros)).toEqual(['senha'])
    // 37 caracteres "é" = 74 bytes em UTF-8
    expect(Object.keys(validarCadastroCliente({ nome: 'Ana', email: 'a@b.co', senha: 'é'.repeat(37) }).erros)).toEqual(['senha'])
  })

  it('nome acima de 100 caracteres é inválido', () => {
    expect(Object.keys(validarCadastroCliente({ nome: 'a'.repeat(101), email: 'a@b.co', senha: '123456' }).erros)).toEqual(['nome'])
  })

  it('e-mail acima de 254 caracteres é inválido', () => {
    const email = `${'a'.repeat(250)}@b.co`
    expect(validarCadastroCliente({ nome: 'Ana', email, senha: '123456' }).erros).toEqual({ email: 'E-mail inválido' })
  })

  it('body ausente: erro nos três campos', () => {
    expect(Object.keys(validarCadastroCliente(undefined).erros).sort()).toEqual(['email', 'nome', 'senha'])
  })
})

describe('normalizarEmail', () => {
  it('tira espaços das pontas e passa para minúsculas', () => {
    expect(normalizarEmail('  Ana.Silva@Exemplo.COM ')).toBe('ana.silva@exemplo.com')
  })
})
