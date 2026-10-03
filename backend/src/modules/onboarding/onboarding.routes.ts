import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.js'
import { aceite, create, show } from './onboarding.controller.js'

export const onboardingRouter = Router()

onboardingRouter.post('/solicitacoes', asyncHandler(create))
onboardingRouter.get('/solicitacoes/:id', asyncHandler(show))
onboardingRouter.post('/solicitacoes/:id/aceite', asyncHandler(aceite))
