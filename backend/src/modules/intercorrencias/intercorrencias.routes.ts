import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { create, index, reabrir } from './intercorrencias.controller.js'

export const intercorrenciasRouter = Router()

intercorrenciasRouter.get('/', asyncHandler(index))
intercorrenciasRouter.post('/', asyncHandler(create))
intercorrenciasRouter.patch('/:id', asyncHandler(reabrir))
