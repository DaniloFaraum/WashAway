import type { NextFunction, Request, Response } from 'express'

// Permissão (o que pode), separada de autenticação (quem é, `autenticar`):
// - usado DEPOIS de `autenticar(...)`, que já preenche `req.auth`;
// - sem `req.auth` (rota montada sem `autenticar` antes) → 401;
// - falta alguma das permissões pedidas (todas são exigidas) → 403.
//
// As permissões vêm do token (`req.auth.permissoes`), gravadas no login do
// usuário interno a partir de `UsuarioInterno.permissoes`.
//
// Uso: router.post('/x', autenticar('interno'), autorizar('admin'), asyncHandler(x))

export function autorizar(...permissoes: string[]) {
  if (permissoes.length === 0) {
    throw new Error('autorizar(...permissoes): informe ao menos uma permissão')
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: 'Token de acesso ausente' })
      return
    }

    const temTodas = permissoes.every((permissao) => req.auth!.permissoes.includes(permissao))
    if (!temTodas) {
      res.status(403).json({ error: 'Permissão insuficiente para esta ação' })
      return
    }

    next()
  }
}
