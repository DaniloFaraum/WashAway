import type { Request, Response } from 'express'
import { listItensServicoAtivos } from './itensServico.service.js'

export async function index(_req: Request, res: Response) {
  res.json(await listItensServicoAtivos())
}
