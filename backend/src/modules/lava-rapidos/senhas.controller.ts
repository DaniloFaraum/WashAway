import type { Request, Response } from 'express'
import { conferirSenha } from '../../auth/senha.js'
import { normalizarEmail } from '../../utils/email.js'
import { validarEmailLavaRapido, validarSenhaLavaRapido } from '../onboarding/onboarding.validation.js'
import { sessaoDoLavaRapido } from './lavaRapidos.service.js'
import { ESCOPO_TROCAR_SENHA, esqueciSenha, getSenhasDoLavaRapido, trocarSenha } from './senhas.service.js'

// Rotas de senha do painel (i17-senha-gerada). Nunca logar o body: tem senha.

export const MENSAGEM_ESQUECI_SENHA = 'Se o e-mail estiver cadastrado, enviaremos uma senha temporária'

/**
 * POST /auth/lava-rapido/trocar-senha `{ novaSenha, senhaAtual? }` → sessão normal
 * `{ token, expiraEm, trocaDeSenhaObrigatoria: false, lavaRapido }`.
 * - token de escopo `trocar-senha` (login com a senha gerada): só a `novaSenha`;
 *   vale enquanto a senha gerada existir (depois da troca, `401`);
 * - token normal: exige a `senhaAtual` (senha própria) — errada → `403`.
 */
export async function trocar(req: Request, res: Response) {
  const auth = req.auth!
  const { novaSenha, senhaAtual } = req.body ?? {}

  const lavaRapido = await getSenhasDoLavaRapido(auth.id)
  const modoTroca = auth.escopo === ESCOPO_TROCAR_SENHA
  if (!lavaRapido || (modoTroca && !lavaRapido.senhaGerada)) {
    res.status(401).json({ error: 'Sessão inválida ou expirada. Entre de novo.' })
    return
  }

  if (!modoTroca && (typeof senhaAtual !== 'string' || !(await conferirSenha(senhaAtual, lavaRapido.senha)))) {
    res.status(403).json({ error: 'Senha atual incorreta' })
    return
  }

  const erroSenha = validarSenhaLavaRapido(novaSenha)
  if (erroSenha) {
    res.status(400).json({ error: erroSenha })
    return
  }
  if (modoTroca && (await conferirSenha(novaSenha, lavaRapido.senhaGerada))) {
    res.status(400).json({ error: 'A nova senha precisa ser diferente da senha temporária' })
    return
  }

  await trocarSenha(lavaRapido.id, novaSenha)
  res.json(await sessaoDoLavaRapido(lavaRapido.id))
}

/**
 * POST /auth/lava-rapido/esqueci-senha `{ email }` (público) → sempre `200` com a
 * mesma mensagem, exista ou não a empresa (não revela quais e-mails existem).
 */
export async function esqueci(req: Request, res: Response) {
  const { email } = req.body ?? {}
  const erroEmail = validarEmailLavaRapido(email)
  if (erroEmail) {
    res.status(400).json({ error: erroEmail })
    return
  }

  await esqueciSenha(normalizarEmail(email))
  res.json({ mensagem: MENSAGEM_ESQUECI_SENHA })
}
