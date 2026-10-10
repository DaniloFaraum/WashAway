export const TEXTO_ACEITE = 'eu aceito'

export function isAceiteValido(aceite: unknown): boolean {
  return typeof aceite === 'string' && aceite.trim().toLowerCase() === TEXTO_ACEITE
}

// I17: e-mail e senha própria na solicitação do onboarding.
export const SENHA_MINIMA_LAVA_RAPIDO = 8
// O bcrypt só considera os 72 primeiros bytes da senha.
export const SENHA_MAXIMA_BYTES_LAVA_RAPIDO = 72
export const EMAIL_MAXIMO_LAVA_RAPIDO = 254
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** E-mail como é gravado e buscado: sem espaços nas pontas e em minúsculas. */
export function normalizarEmailLavaRapido(email: string): string {
  return email.trim().toLowerCase()
}

/** @returns a mensagem de erro, ou `null` se o e-mail for válido */
export function validarEmailLavaRapido(email: unknown): string | null {
  if (typeof email !== 'string' || email.trim() === '') return 'email é obrigatório'
  const limpo = email.trim()
  if (limpo.length > EMAIL_MAXIMO_LAVA_RAPIDO || !FORMATO_EMAIL.test(limpo)) return 'email inválido'
  return null
}

/** @returns a mensagem de erro, ou `null` se a senha for válida */
export function validarSenhaLavaRapido(senha: unknown): string | null {
  if (typeof senha !== 'string' || senha.length < SENHA_MINIMA_LAVA_RAPIDO) {
    return `A senha precisa ter no mínimo ${SENHA_MINIMA_LAVA_RAPIDO} caracteres`
  }
  if (Buffer.byteLength(senha, 'utf8') > SENHA_MAXIMA_BYTES_LAVA_RAPIDO) {
    return `A senha pode ter no máximo ${SENHA_MAXIMA_BYTES_LAVA_RAPIDO} caracteres`
  }
  return null
}
