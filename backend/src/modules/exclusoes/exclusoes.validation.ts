// Textos livres opcionais do fluxo de exclusão (`motivo` da empresa e
// `observacao` do interno): ausente/null/vazio = null; texto é aparado;
// outro tipo ou longo demais = inválido.

export const TEXTO_MAXIMO = 500

export type TextoOpcional = { valido: true; valor: string | null } | { valido: false; erro: string }

export function textoOpcional(valor: unknown, campo: string): TextoOpcional {
  if (valor === undefined || valor === null) return { valido: true, valor: null }
  if (typeof valor !== 'string') return { valido: false, erro: `${campo} deve ser um texto` }
  const aparado = valor.trim()
  if (aparado.length > TEXTO_MAXIMO) {
    return { valido: false, erro: `${campo} deve ter no máximo ${TEXTO_MAXIMO} caracteres` }
  }
  return { valido: true, valor: aparado === '' ? null : aparado }
}
