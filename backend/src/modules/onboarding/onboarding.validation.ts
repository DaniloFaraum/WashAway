export const TEXTO_ACEITE = 'eu aceito'

export function isAceiteValido(aceite: unknown): boolean {
  return typeof aceite === 'string' && aceite.trim().toLowerCase() === TEXTO_ACEITE
}
