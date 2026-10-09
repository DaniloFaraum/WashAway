import type { Request, Response } from 'express'
import { prisma } from '../../config/prisma.js'
import { listarHorarios } from './horarios.service.js'

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
