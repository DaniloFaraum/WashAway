import { Router } from 'express'
import { index, show } from './lavaRapidos.controller.js'

export const lavaRapidosRouter = Router()

lavaRapidosRouter.get('/', index)
lavaRapidosRouter.get('/:id', show)
