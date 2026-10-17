import type { Request, Response } from 'express'
import { prisma } from '../../config/prisma.js'
import { listarHorarios, substituirHorarios } from './horarios.service.js'
import { parseHorariosInput } from './horarios.validation.js'

/** GET /lavaRapidos/:id/horarios (público): os 7 dias, na ordem 0 (domingo) a 6 (sábado). */
export async function index(req: Request, res: Response) {
  const { id } = req.params
  const existe = await prisma.lavaRapido.findUnique({ where: { id }, select: { id: true } })
  if (!existe) {
    res.status(404).json({ error: 'Lava-rápido não encontrado' })
    return
  }
  res.json(await listarHorarios(id))
}

/**
 * PUT /lavaRapidos/:id/horarios (painel, autenticar('lavaRapido')): substitui os 7 dias.
 * A empresa vem do token; `:id` de outra empresa = 404 (isolamento do I17), sem alterar nada.
 */
export async function update(req: Request, res: Response) {
  const lavaRapidoId = req.auth!.id
  if (req.params.id !== lavaRapidoId) {
    res.status(404).json({ error: 'Lava-rápido não encontrado' })
    return
  }

  const resultado = parseHorariosInput(req.body)
  if (!resultado.ok) {
    res.status(400).json({ error: resultado.erro })
    return
  }

  // Token válido de uma empresa que não existe mais: a sessão não vale.
  const existe = await prisma.lavaRapido.findUnique({ where: { id: lavaRapidoId }, select: { id: true } })
  if (!existe) {
    res.status(401).json({ error: 'Sessão inválida' })
    return
  }

  res.json(await substituirHorarios(lavaRapidoId, resultado.dias))
}
