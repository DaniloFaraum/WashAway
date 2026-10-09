import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { index } from './horarios.controller.js'

// Montado em /lavaRapidos/:id/horarios (mergeParams para enxergar o :id).
// A escrita (PUT, protegida por autenticar('lavaRapido')) entra na parte 2 do I19.
export const horariosRouter = Router({ mergeParams: true })

horariosRouter.get('/', asyncHandler(index))
