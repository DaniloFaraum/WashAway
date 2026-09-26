import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { index } from './veiculos.controller.js'

export const veiculosRouter = Router()

veiculosRouter.get('/', asyncHandler(index))
