import { EMAIL_MAXIMO, FORMATO_EMAIL, normalizarEmail } from '../../utils/email.js'

// Regras do cadastro de cliente (I1). Mesmas regras que o app valida antes de
// enviar (app_mobile/src/features/clientes/validarCadastro.ts).

export const SENHA_MINIMA_CLIENTE = 6
// O bcrypt só considera os 72 primeiros bytes da senha: acima disso, senhas
// diferentes passariam a valer como iguais.
export const SENHA_MAXIMA_BYTES_CLIENTE = 72
export const NOME_MAXIMO_CLIENTE = 100

export type CamposCadastroCliente = 'nome' | 'email' | 'senha'
export type ErrosCadastroCliente = Partial<Record<CamposCadastroCliente, string>>

export interface DadosCadastroCliente {
  nome: string
  email: string
  senha: string
}

// Reexportado: quem já importava daqui continua funcionando.
export { normalizarEmail }

/**
 * Valida o body do cadastro. Devolve os erros por campo (vazio = válido) e,
 * quando válido, os dados já limpos (nome com trim, e-mail normalizado).
 */
export function validarCadastroCliente(
  body: unknown,
): { erros: ErrosCadastroCliente; dados?: DadosCadastroCliente } {
  const { nome, email, senha } = (body ?? {}) as Record<string, unknown>
  const erros: ErrosCadastroCliente = {}

  if (typeof nome !== 'string' || nome.trim() === '') {
    erros.nome = 'Nome é obrigatório'
  } else if (nome.trim().length > NOME_MAXIMO_CLIENTE) {
    erros.nome = `O nome pode ter no máximo ${NOME_MAXIMO_CLIENTE} caracteres`
  }

  if (typeof email !== 'string' || email.trim() === '') {
    erros.email = 'E-mail é obrigatório'
  } else if (email.trim().length > EMAIL_MAXIMO || !FORMATO_EMAIL.test(email.trim())) {
    erros.email = 'E-mail inválido'
  }

  if (typeof senha !== 'string' || senha.length < SENHA_MINIMA_CLIENTE) {
    erros.senha = `A senha precisa ter no mínimo ${SENHA_MINIMA_CLIENTE} caracteres`
  } else if (Buffer.byteLength(senha, 'utf8') > SENHA_MAXIMA_BYTES_CLIENTE) {
    erros.senha = `A senha pode ter no máximo ${SENHA_MAXIMA_BYTES_CLIENTE} caracteres`
  }

  if (Object.keys(erros).length > 0) return { erros }
  return {
    erros,
    dados: { nome: (nome as string).trim(), email: normalizarEmail(email as string), senha: senha as string },
  }
}
