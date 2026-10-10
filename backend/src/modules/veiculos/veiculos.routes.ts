import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { autenticar } from '../../middlewares/autenticar.js'
import { index } from './veiculos.controller.js'

// Veículos atendidos pela empresa (painel): exige token de lava-rápido (I17).
export const veiculosRouter = Router()

veiculosRouter.get('/', autenticar('lavaRapido'), asyncHandler(index))
