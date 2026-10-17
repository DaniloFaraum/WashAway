import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { autorizar } from '../../middlewares/autorizar.js'
import { internoAtivo } from '../internos/internos.middleware.js'
import { aprovar, cancelar, listar, recusar, solicitar, verDaEmpresa } from './exclusoes.controller.js'

// Lado da empresa (montado em /lavaRapidos/me/solicitacao-exclusao): só
// solicita, vê e cancela. Quem exclui é um interno `admin`, ao aprovar.
export const solicitacaoExclusaoEmpresaRouter = Router()

solicitacaoExclusaoEmpresaRouter.use(autenticar('lavaRapido'))
solicitacaoExclusaoEmpresaRouter.post('/', asyncHandler(solicitar))
solicitacaoExclusaoEmpresaRouter.get('/', asyncHandler(verDaEmpresa))
solicitacaoExclusaoEmpresaRouter.delete('/', asyncHandler(cancelar))

// Lado interno (montado em /interno/solicitacoes-exclusao): autenticação
// (401) e permissão (403) separadas; `internoAtivo` confere no banco que o
// interno ainda existe e ainda tem `admin` (o token vale 7 dias). Sem tela
// nesta sprint — operado pelo Swagger (/api-docs) com o token de
// POST /auth/interno/login.
export const solicitacoesExclusaoInternoRouter = Router()

solicitacoesExclusaoInternoRouter.use(autenticar('interno'), autorizar('admin'), asyncHandler(internoAtivo('admin')))
solicitacoesExclusaoInternoRouter.get('/', asyncHandler(listar))
solicitacoesExclusaoInternoRouter.post('/:id/aprovar', asyncHandler(aprovar))
solicitacoesExclusaoInternoRouter.post('/:id/recusar', asyncHandler(recusar))
