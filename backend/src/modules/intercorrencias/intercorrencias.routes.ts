import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { create, index, reabrir } from './intercorrencias.controller.js'

// GET público (app do cliente); escrita exige token de lava-rápido (I17).
export const intercorrenciasRouter = Router()

intercorrenciasRouter.get('/', asyncHandler(index))
intercorrenciasRouter.post('/', autenticar('lavaRapido'), asyncHandler(create))
intercorrenciasRouter.patch('/:id', autenticar('lavaRapido'), asyncHandler(reabrir))
