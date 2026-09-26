import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { index, updateAtivo } from './servicos.controller.js'

export const servicosRouter = Router()

servicosRouter.get('/', asyncHandler(index))
servicosRouter.patch('/:id', asyncHandler(updateAtivo))
