import type { Request, Response } from 'express'
import { autenticarUsuarioInterno, sessaoDoInterno } from './internos.service.js'

// Nunca logar o body: ele traz a senha em texto puro.

const CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos'

/** POST /auth/interno/login → `{ token, expiraEm, interno }` */
export async function login(req: Request, res: Response) {
  const { email, senha } = req.body ?? {}
  if (typeof email !== 'string' || typeof senha !== 'string' || email.trim() === '' || senha === '') {
    res.status(401).json({ error: CREDENCIAIS_INVALIDAS })
    return
  }

  const interno = await autenticarUsuarioInterno(email, senha)
  if (!interno) {
    res.status(401).json({ error: CREDENCIAIS_INVALIDAS })
    return
  }

  res.json(sessaoDoInterno(interno))
}
