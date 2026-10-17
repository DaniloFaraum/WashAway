import type { Request, Response } from 'express'
import { normalizarEmail } from '../../utils/email.js'
import { validarEmailLavaRapido } from '../onboarding/onboarding.validation.js'
import { sessaoDoLavaRapido } from './lavaRapidos.service.js'
import { ESCOPO_TROCAR_SENHA, esqueciSenha, trocarSenhaDoPainel } from './senhas.service.js'

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
  const resultado = await trocarSenhaDoPainel(auth.id, auth.escopo === ESCOPO_TROCAR_SENHA, req.body ?? {})

  switch (resultado.tipo) {
    case 'sessao_invalida':
      res.status(401).json({ error: 'Sessão inválida ou expirada. Entre de novo.' })
      return
    case 'senha_atual_incorreta':
      res.status(403).json({ error: 'Senha atual incorreta' })
      return
    case 'senha_invalida':
      res.status(400).json({ error: resultado.erro })
      return
    case 'igual_temporaria':
      res.status(400).json({ error: 'A nova senha precisa ser diferente da senha temporária' })
      return
    case 'ok':
      res.json(await sessaoDoLavaRapido(auth.id))
  }
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
