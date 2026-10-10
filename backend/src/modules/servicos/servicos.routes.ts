import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { create, index, update, updateAtivo } from './servicos.controller.js'

// GET público (app do cliente); escrita exige token de lava-rápido (I17).
export const servicosRouter = Router()

servicosRouter.get('/', asyncHandler(index))
servicosRouter.post('/', autenticar('lavaRapido'), asyncHandler(create))
servicosRouter.put('/:id', autenticar('lavaRapido'), asyncHandler(update))
servicosRouter.patch('/:id', autenticar('lavaRapido'), asyncHandler(updateAtivo))
