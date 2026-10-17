import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { login } from './internos.controller.js'

// Login da equipe WashAway (montado em /auth/interno). O limite de tentativas
// fica em app.ts. Não há rota de cadastro: internos só por script/seed/demo.
export const authInternoRouter = Router()

authInternoRouter.post('/login', asyncHandler(login))
