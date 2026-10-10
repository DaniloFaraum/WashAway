import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { getStringQueryParam } from '../../utils/queryParam.js'
import { createIntercorrencia, listIntercorrencias, reabrirIntercorrencia } from './intercorrencias.service.js'
import { parseIntercorrenciaInput } from './intercorrencias.validation.js'

// Leitura pública (app do cliente, D3): `GET /intercorrencias?lavaRapidoId=`.
// Escrita só pelo painel (autenticar('lavaRapido')): a empresa é `req.auth.id`
// e intercorrência de outra empresa = 404.

export async function index(req: Request, res: Response) {
  const intercorrencias = await listIntercorrencias(getStringQueryParam(req.query.lavaRapidoId))
  res.json(intercorrencias)
}

export async function reabrir(req: Request, res: Response) {
  const { reaberta } = req.body ?? {}

  if (reaberta !== true) {
    res.status(400).json({ error: 'body inválido — só aceita { reaberta: true }' })
    return
  }

  const intercorrencia = await reabrirIntercorrencia(req.params.id, req.auth!.id)
  if (!intercorrencia) {
    res.status(404).json({ error: 'Intercorrência não encontrada' })
    return
  }
  res.json(intercorrencia)
}

export async function create(req: Request, res: Response) {
  const input = parseIntercorrenciaInput(req.body)

  if (!input) {
    res.status(400).json({
      error: 'body inválido — precisa de data, motivo, diaInteiro; horaInicio/horaFim só quando diaInteiro é false',
    })
    return
  }

  try {
    const intercorrencia = await createIntercorrencia(req.auth!.id, input)
    res.status(201).json(intercorrencia)
  } catch (error) {
    // Token válido de uma empresa que não existe mais: a sessão não vale.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      res.status(401).json({ error: 'Sessão inválida' })
      return
    }
    throw error
  }
}
