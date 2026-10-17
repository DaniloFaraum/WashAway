import { conferirSenha, gerarHashSenha } from '../../auth/senha.js'
import { assinarToken, expiracaoDoToken } from '../../auth/token.js'
import { prisma } from '../../config/prisma.js'
import { normalizarEmail } from '../../utils/email.js'

// Usuários internos (equipe WashAway, i17-interno-exclusao). Só são criados por
// script/seed/demo (`criarUsuarioInterno`) — não há rota de cadastro.

export function omitSenhaInterno<T extends { senha: string }>(interno: T): Omit<T, 'senha'> {
  const { senha: _senha, ...resto } = interno
  return resto
}

export type CriarUsuarioInternoInput = {
  nome: string
  email: string
  /** Senha em texto puro; é gravada só como hash bcrypt. */
  senha: string
  permissoes: string[]
}

export async function criarUsuarioInterno({ nome, email, senha, permissoes }: CriarUsuarioInternoInput) {
  return prisma.usuarioInterno.create({
    data: { nome, email: normalizarEmail(email), senha: await gerarHashSenha(senha), permissoes },
  })
}

export function getUsuarioInternoById(id: string) {
  return prisma.usuarioInterno.findUnique({ where: { id } })
}

/** Interno dono das credenciais, ou `null` (e-mail inexistente ou senha errada — no mesmo tempo). */
export async function autenticarUsuarioInterno(email: string, senha: string) {
  const interno = await prisma.usuarioInterno.findUnique({ where: { email: normalizarEmail(email) } })
  return (await conferirSenha(senha, interno?.senha)) ? interno : null
}

/** Sessão do interno: token `tipo: 'interno'` com as permissões atuais do banco. */
export function sessaoDoInterno<T extends { id: string; senha: string; permissoes: string[] }>(interno: T) {
  const token = assinarToken({ id: interno.id, tipo: 'interno', permissoes: interno.permissoes })
  return { token, expiraEm: expiracaoDoToken(token), interno: omitSenhaInterno(interno) }
}
