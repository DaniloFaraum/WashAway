import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { create, index } from './intercorrencias.controller.js'

export const intercorrenciasRouter = Router()

intercorrenciasRouter.get('/', asyncHandler(index))
intercorrenciasRouter.post('/', asyncHandler(create))
