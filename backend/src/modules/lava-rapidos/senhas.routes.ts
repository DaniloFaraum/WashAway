import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticarAceitandoEscopo } from '../../middlewares/autenticar.js'
import { esqueci, trocar } from './senhas.controller.js'
import { ESCOPO_TROCAR_SENHA } from './senhas.service.js'

// /auth/lava-rapido (i17-senha-gerada). Os limites de tentativas ficam em app.ts.
export const authLavaRapidoRouter = Router()

authLavaRapidoRouter.post(
  '/trocar-senha',
  autenticarAceitandoEscopo(ESCOPO_TROCAR_SENHA, 'lavaRapido'),
  asyncHandler(trocar),
)
authLavaRapidoRouter.post('/esqueci-senha', asyncHandler(esqueci))
