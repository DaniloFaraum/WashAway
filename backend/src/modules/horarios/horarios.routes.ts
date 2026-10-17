import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { index, update } from './horarios.controller.js'

// Montado em /lavaRapidos/:id/horarios (mergeParams para enxergar o :id).
// GET público (app do cliente); PUT só pelo painel, para a empresa do próprio token (I19 parte 2).
export const horariosRouter = Router({ mergeParams: true })

horariosRouter.get('/', asyncHandler(index))
horariosRouter.put('/', autenticar('lavaRapido'), asyncHandler(update))
