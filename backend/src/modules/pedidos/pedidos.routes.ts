import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { create, index, updateStatus } from './pedidos.controller.js'

// Gestão de pedidos do painel: exige token de lava-rápido (I17).
// Criação pelo app (I13): exige token de cliente.
export const pedidosRouter = Router()

pedidosRouter.post('/', autenticar('cliente'), asyncHandler(create))

pedidosRouter.get('/', autenticar('lavaRapido'), asyncHandler(index))
pedidosRouter.patch('/:id', autenticar('lavaRapido'), asyncHandler(updateStatus))
