import { describe, expect, it } from 'vitest'
import { validarCadastro, type FormCadastro } from '../features/clientes/validarCadastro'

function form(overrides: Partial<FormCadastro> = {}): FormCadastro {
  return { nome: 'Ana', email: 'ana@exemplo.com', senha: '123456', confirmacao: '123456', ...overrides }
}

describe('validarCadastro', () => {
  it('formulário válido não tem erros', () => {
    expect(validarCadastro(form())).toEqual({})
  })

  it('campos obrigatórios: cada campo vazio tem o seu erro', () => {
    const erros = validarCadastro({ nome: '  ', email: '', senha: '', confirmacao: '' })

    expect(Object.keys(erros).sort()).toEqual(['confirmacao', 'email', 'nome', 'senha'])
  })

  it.each(['ana', 'ana@', 'ana@exemplo', 'ana @exemplo.com'])('e-mail com formato inválido (%s)', (email) => {
    expect(validarCadastro(form({ email }))).toEqual({ email: 'E-mail inválido' })
  })

  it('aceita e-mail com espaços nas pontas', () => {
    expect(validarCadastro(form({ email: '  ana@exemplo.com ' }))).toEqual({})
  })

  it('senha com menos de 6 caracteres', () => {
    expect(validarCadastro(form({ senha: '12345', confirmacao: '12345' }))).toEqual({
      senha: 'A senha precisa ter no mínimo 6 caracteres',
    })
  })

  it('senha com mais de 72 caracteres (limite do backend)', () => {
    const longa = 'a'.repeat(73)
    expect(validarCadastro(form({ senha: longa, confirmacao: longa }))).toEqual({
      senha: 'A senha pode ter no máximo 72 caracteres',
    })
    const limite = 'a'.repeat(72)
    expect(validarCadastro(form({ senha: limite, confirmacao: limite }))).toEqual({})
  })

  it('nome com mais de 100 caracteres', () => {
    expect(validarCadastro(form({ nome: 'a'.repeat(101) }))).toEqual({ nome: 'O nome pode ter no máximo 100 caracteres' })
  })

  it('e-mail com mais de 254 caracteres', () => {
    expect(validarCadastro(form({ email: `${'a'.repeat(250)}@b.co` }))).toEqual({ email: 'E-mail inválido' })
  })

  it('senha e confirmação diferentes', () => {
    expect(validarCadastro(form({ confirmacao: '654321' }))).toEqual({ confirmacao: 'As senhas não conferem' })
  })
})
