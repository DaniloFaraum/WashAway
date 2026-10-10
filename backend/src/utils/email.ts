// Regras de e-mail compartilhadas (cliente, lava-rápido e chave do limite de
// tentativas): o e-mail é gravado, buscado e contado sempre na mesma forma.

export const EMAIL_MAXIMO = 254
export const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** E-mail como é gravado e buscado: sem espaços nas pontas e em minúsculas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}
