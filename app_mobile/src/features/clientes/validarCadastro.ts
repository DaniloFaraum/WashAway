// Validação do formulário de cadastro (I1), antes de enviar. Mesmas regras do
// backend (backend/src/modules/clientes/clientes.validation.ts) + confirmação.

export const SENHA_MINIMA = 6
// Limites do backend. A senha lá é medida em bytes (limite do bcrypt); aqui em
// caracteres — com acentos o backend ainda pode recusar, e a tela mostra o erro.
export const SENHA_MAXIMA = 72
export const NOME_MAXIMO = 100
export const EMAIL_MAXIMO = 254
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface FormCadastro {
  nome: string
  email: string
  senha: string
  confirmacao: string
}

export type ErrosCadastro = Partial<Record<keyof FormCadastro, string>>

/** Mapa campo → mensagem. Vazio = pode enviar. */
export function validarCadastro({ nome, email, senha, confirmacao }: FormCadastro): ErrosCadastro {
  const erros: ErrosCadastro = {}

  if (nome.trim() === '') erros.nome = 'Informe seu nome'
  else if (nome.trim().length > NOME_MAXIMO) erros.nome = `O nome pode ter no máximo ${NOME_MAXIMO} caracteres`

  if (email.trim() === '') erros.email = 'Informe seu e-mail'
  else if (email.trim().length > EMAIL_MAXIMO || !FORMATO_EMAIL.test(email.trim())) erros.email = 'E-mail inválido'

  if (senha === '') erros.senha = 'Informe uma senha'
  else if (senha.length < SENHA_MINIMA) erros.senha = `A senha precisa ter no mínimo ${SENHA_MINIMA} caracteres`
  else if (senha.length > SENHA_MAXIMA) erros.senha = `A senha pode ter no máximo ${SENHA_MAXIMA} caracteres`

  if (confirmacao === '') erros.confirmacao = 'Confirme a senha'
  else if (senha !== confirmacao) erros.confirmacao = 'As senhas não conferem'

  return erros
}
