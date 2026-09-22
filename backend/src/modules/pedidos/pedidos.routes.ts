import { Router } from 'express'
import { index, updateStatus } from './pedidos.controller.js'

export const pedidosRouter = Router()

pedidosRouter.get('/', index)
pedidosRouter.patch('/:id', updateStatus)
