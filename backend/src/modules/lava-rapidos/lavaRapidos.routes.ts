import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { create, index, login, show } from './lavaRapidos.controller.js'

export const lavaRapidosRouter = Router()

lavaRapidosRouter.get('/', asyncHandler(index))
lavaRapidosRouter.post('/', asyncHandler(create))
lavaRapidosRouter.post('/login', asyncHandler(login))
lavaRapidosRouter.get('/:id', asyncHandler(show))
