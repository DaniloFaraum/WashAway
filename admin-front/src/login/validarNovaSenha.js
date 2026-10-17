// Regra de senha do painel (mesma do backend: onboarding e troca de senha, I17).
export const SENHA_MINIMA = 8

/**
 * @param {string} senha
 * @param {string} confirmarSenha
 * @returns {string | null} mensagem de erro, ou null se a senha estiver ok
 */
export function validarNovaSenha(senha, confirmarSenha) {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter no mínimo ${SENHA_MINIMA} caracteres.`
  if (senha !== confirmarSenha) return 'As senhas não conferem.'
  return null
}
