// Regras do cadastro de cliente (I1). Mesmas regras que o app valida antes de
// enviar (app_mobile/src/features/clientes/validarCadastro.ts).

export const SENHA_MINIMA_CLIENTE = 6
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type CamposCadastroCliente = 'nome' | 'email' | 'senha'
export type ErrosCadastroCliente = Partial<Record<CamposCadastroCliente, string>>

export interface DadosCadastroCliente {
  nome: string
  email: string
  senha: string
}

/** E-mail como é gravado e buscado: sem espaços nas pontas e em minúsculas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

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
  }

  if (typeof email !== 'string' || email.trim() === '') {
    erros.email = 'E-mail é obrigatório'
  } else if (!FORMATO_EMAIL.test(email.trim())) {
    erros.email = 'E-mail inválido'
  }

  if (typeof senha !== 'string' || senha.length < SENHA_MINIMA_CLIENTE) {
    erros.senha = `A senha precisa ter no mínimo ${SENHA_MINIMA_CLIENTE} caracteres`
  }

  if (Object.keys(erros).length > 0) return { erros }
  return {
    erros,
    dados: { nome: (nome as string).trim(), email: normalizarEmail(email as string), senha: senha as string },
  }
}
