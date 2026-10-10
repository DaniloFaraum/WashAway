import type { Request, Response } from 'express'
import { listVeiculos } from './veiculos.service.js'

// Painel (autenticar('lavaRapido')): veículos dos pedidos da empresa do token.
export async function index(req: Request, res: Response) {
  const veiculos = await listVeiculos(req.auth!.id)
  res.json(veiculos)
}
