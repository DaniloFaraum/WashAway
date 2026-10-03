import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { create, index, update, updateAtivo } from './servicos.controller.js'

export const servicosRouter = Router()

servicosRouter.get('/', asyncHandler(index))
servicosRouter.post('/', asyncHandler(create))
servicosRouter.put('/:id', asyncHandler(update))
servicosRouter.patch('/:id', asyncHandler(updateAtivo))
