import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { index } from './itensServico.controller.js'

// Só leitura: o catálogo é mantido via seed/banco, a loja não cria itens.
export const itensServicoRouter = Router()

itensServicoRouter.get('/', asyncHandler(index))
