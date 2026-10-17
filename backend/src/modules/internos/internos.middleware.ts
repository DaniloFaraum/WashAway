import type { NextFunction, Request, Response } from 'express'
import { getUsuarioInternoById } from './internos.service.js'

// Confere no BANCO, a cada requisição, que o interno do token ainda existe e
// ainda tem as permissões pedidas. As permissões do token (`autorizar`) valem
// até ele expirar (7 dias); sem esta checagem, tirar `admin` de alguém (ou
// remover o interno) não impediria que ele aprovasse uma exclusão.
// - interno removido → 401 'Sessão inválida';
// - falta alguma permissão no banco → 403.
//
// Uso (depois de autenticar('interno') e autorizar(...)):
//   router.use(autenticar('interno'), autorizar('admin'), asyncHandler(internoAtivo('admin')))

export function internoAtivo(...permissoes: string[]) {
  if (permissoes.length === 0) {
    throw new Error('internoAtivo(...permissoes): informe ao menos uma permissão')
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const interno = req.auth ? await getUsuarioInternoById(req.auth.id) : null
    if (!interno) {
      res.status(401).json({ error: 'Sessão inválida' })
      return
    }
    if (!permissoes.every((permissao) => interno.permissoes.includes(permissao))) {
      res.status(403).json({ error: 'Permissão insuficiente para esta ação' })
      return
    }
    next()
  }
}
