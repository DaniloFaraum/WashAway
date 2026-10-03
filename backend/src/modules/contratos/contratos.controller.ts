import type { Request, Response } from 'express'
import { getContratoVigente } from './contratos.service.js'

export async function vigente(_req: Request, res: Response) {
  const contrato = await getContratoVigente()
  if (!contrato) {
    res.status(404).json({ error: 'Nenhum contrato vigente' })
    return
  }
  res.json(contrato)
}
