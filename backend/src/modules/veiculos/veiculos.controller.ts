import type { Request, Response } from 'express'
import { getStringQueryParam } from '../../utils/queryParam.js'
import { listVeiculos } from './veiculos.service.js'

export async function index(req: Request, res: Response) {
  const veiculos = await listVeiculos(getStringQueryParam(req.query.lavaRapidoId))
  res.json(veiculos)
}
