import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { detalhe, listar, marcarVisto, notificacoes } from './pedidosCliente.controller.js'

// Pedidos do cliente logado (I18), montado em /clientes/me/pedidos. Não
// confundir com `pedidosRouter` (modules/pedidos: POST /pedidos e o painel).
export const pedidosClienteRouter = Router()

pedidosClienteRouter.use(autenticar('cliente'))
pedidosClienteRouter.get('/', asyncHandler(listar))
pedidosClienteRouter.get('/:id', asyncHandler(detalhe))
pedidosClienteRouter.post('/:id/visto', asyncHandler(marcarVisto))

// Contadores do app (I18), montado em /clientes/me/notificacoes.
export const notificacoesClienteRouter = Router()

notificacoesClienteRouter.use(autenticar('cliente'))
notificacoesClienteRouter.get('/', asyncHandler(notificacoes))
