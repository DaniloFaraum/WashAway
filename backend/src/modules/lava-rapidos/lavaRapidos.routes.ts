import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { index, show } from './lavaRapidos.controller.js'

export const lavaRapidosRouter = Router()

lavaRapidosRouter.get('/', asyncHandler(index))
lavaRapidosRouter.get('/:id', asyncHandler(show))
