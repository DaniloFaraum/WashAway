import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { index, updateStatus } from './pedidos.controller.js'

// Gestão de pedidos do painel: exige token de lava-rápido (I17).
export const pedidosRouter = Router()

pedidosRouter.get('/', autenticar('lavaRapido'), asyncHandler(index))
pedidosRouter.patch('/:id', autenticar('lavaRapido'), asyncHandler(updateStatus))
