import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { vigente } from './contratos.controller.js'

export const contratosRouter = Router()

contratosRouter.get('/vigente', asyncHandler(vigente))
