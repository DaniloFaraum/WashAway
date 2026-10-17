import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { notificacoesClienteRouter, pedidosClienteRouter } from '../pedidos-cliente/pedidosCliente.routes.js'
import { veiculosClienteRouter } from '../veiculos-cliente/veiculosCliente.routes.js'
import { cadastro, login, me } from './clientes.controller.js'

// Rotas públicas de conta do cliente (montadas em /auth/cliente).
export const authClienteRouter = Router()

authClienteRouter.post('/cadastro', asyncHandler(cadastro))
authClienteRouter.post('/login', asyncHandler(login))

// Recursos do cliente logado (montadas em /clientes). Cada recurso de /me tem o
// seu router (I3: /me/veiculos; I18: /me/pedidos etc.).
export const clientesRouter = Router()

clientesRouter.get('/me', autenticar('cliente'), asyncHandler(me))
clientesRouter.use('/me/veiculos', veiculosClienteRouter)
clientesRouter.use('/me/pedidos', pedidosClienteRouter)
clientesRouter.use('/me/notificacoes', notificacoesClienteRouter)
