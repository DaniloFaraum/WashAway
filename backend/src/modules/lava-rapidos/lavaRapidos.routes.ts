import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { index, login, show } from './lavaRapidos.controller.js'

// Todas públicas. O limite de tentativas do login fica em app.ts.
export const lavaRapidosRouter = Router()

lavaRapidosRouter.get('/', asyncHandler(index))
lavaRapidosRouter.post('/login', asyncHandler(login))
lavaRapidosRouter.get('/:id', asyncHandler(show))
