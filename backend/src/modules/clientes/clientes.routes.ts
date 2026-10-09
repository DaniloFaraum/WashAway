import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { cadastro, login, me } from './clientes.controller.js'

// Rotas públicas de conta do cliente (montadas em /auth/cliente).
export const authClienteRouter = Router()

authClienteRouter.post('/cadastro', asyncHandler(cadastro))
authClienteRouter.post('/login', asyncHandler(login))

// Recursos do cliente logado (montadas em /clientes). I3/I18 acrescentam
// /me/veiculos, /me/pedidos etc. aqui ou em routers próprios.
export const clientesRouter = Router()

clientesRouter.get('/me', autenticar('cliente'), asyncHandler(me))
