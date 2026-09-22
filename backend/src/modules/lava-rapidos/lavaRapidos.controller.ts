import type { Request, Response } from 'express'
import { getLavaRapidoById, listLavaRapidos } from './lavaRapidos.service.js'

export async function index(_req: Request, res: Response) {
  const lavaRapidos = await listLavaRapidos()
  res.json(lavaRapidos)
}

export async function show(req: Request, res: Response) {
  const lavaRapido = await getLavaRapidoById(req.params.id)
  if (!lavaRapido) {
    res.status(404).json({ error: 'Lava-rápido não encontrado' })
    return
  }
  res.json(lavaRapido)
}
