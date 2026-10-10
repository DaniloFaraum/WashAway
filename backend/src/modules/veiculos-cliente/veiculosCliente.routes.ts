import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { atualizar, criar, listar, remover } from './veiculosCliente.controller.js'

// Veículos do cliente logado (I3), montado em /clientes/me/veiculos. Não
// confundir com `veiculosRouter` (modules/veiculos, GET /veiculos do painel).
export const veiculosClienteRouter = Router()

veiculosClienteRouter.use(autenticar('cliente'))
veiculosClienteRouter.get('/', asyncHandler(listar))
veiculosClienteRouter.post('/', asyncHandler(criar))
veiculosClienteRouter.put('/:id', asyncHandler(atualizar))
veiculosClienteRouter.delete('/:id', asyncHandler(remover))
