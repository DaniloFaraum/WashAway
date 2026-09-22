import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { index, updateStatus } from './pedidos.controller.js'

export const pedidosRouter = Router()

pedidosRouter.get('/', asyncHandler(index))
pedidosRouter.patch('/:id', asyncHandler(updateStatus))
