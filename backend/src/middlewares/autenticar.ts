import type { NextFunction, Request, Response } from 'express'
import { verificarToken } from '../auth/token.js'
import type { Autenticacao, TipoUsuario } from '../auth/types.js'

// Autenticação (quem é), separada de permissão (`autorizar`, i17-interno):
// - sem `Authorization: Bearer <token>`, token inválido/expirado → 401;
// - token válido de um tipo não aceito pela rota → 403;
// - token de uso restrito (`escopo`, ex.: 'trocar-senha') → 403 — as rotas que
//   aceitam um escopo específico (i17-senha-gerada) liberam explicitamente;
// - ok → `req.auth = { id, tipo, permissoes, escopo? }`.
//
// Uso: router.get('/me', autenticar('cliente'), asyncHandler(me))

function lerBearer(req: Request): string | null {
  const header = req.headers.authorization
  if (!header) return null
  const [esquema, token, ...resto] = header.trim().split(/\s+/)
  if (esquema?.toLowerCase() !== 'bearer' || !token || resto.length > 0) return null
  return token
}

export function autenticar(...tipos: TipoUsuario[]) {
  if (tipos.length === 0) {
    throw new Error('autenticar(...tipos): informe ao menos um tipo de usuário')
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const token = lerBearer(req)
    if (!token) {
      res.status(401).json({ error: 'Token de acesso ausente' })
      return
    }

    let auth: Autenticacao
    try {
      auth = verificarToken(token)
    } catch {
      res.status(401).json({ error: 'Token de acesso inválido ou expirado' })
      return
    }

    if (!tipos.includes(auth.tipo)) {
      res.status(403).json({ error: 'Acesso não permitido para este tipo de usuário' })
      return
    }

    if (auth.escopo) {
      res.status(403).json({ error: 'Token de uso restrito não permitido nesta rota' })
      return
    }

    req.auth = auth
    next()
  }
}
