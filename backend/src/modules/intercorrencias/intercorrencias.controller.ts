import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { getStringQueryParam } from '../../utils/queryParam.js'
import { createIntercorrencia, listIntercorrencias } from './intercorrencias.service.js'
import { parseIntercorrenciaInput } from './intercorrencias.validation.js'

export async function index(req: Request, res: Response) {
  const intercorrencias = await listIntercorrencias(getStringQueryParam(req.query.lavaRapidoId))
  res.json(intercorrencias)
}

export async function create(req: Request, res: Response) {
  const input = parseIntercorrenciaInput(req.body)

  if (!input) {
    res.status(400).json({
      error:
        'body inválido — precisa de lavaRapidoId, data, motivo, diaInteiro; horaInicio/horaFim só quando diaInteiro é false',
    })
    return
  }

  try {
    const intercorrencia = await createIntercorrencia(input)
    res.status(201).json(intercorrencia)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      res.status(400).json({ error: 'lavaRapidoId inválido — empresa não encontrada' })
      return
    }
    throw error
  }
}
