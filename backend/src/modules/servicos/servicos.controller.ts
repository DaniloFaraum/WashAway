import type { Request, Response } from 'express'
import { getStringQueryParam } from '../../utils/queryParam.js'
import { getServicoById, listServicos, updateServicoAtivo } from './servicos.service.js'

export async function index(req: Request, res: Response) {
  const servicos = await listServicos(getStringQueryParam(req.query.lavaRapidoId))
  res.json(servicos)
}

export async function updateAtivo(req: Request, res: Response) {
  const body = req.body ?? {}
  const { ativo } = body

  if (typeof ativo !== 'boolean' || Object.keys(body).length !== 1) {
    res.status(400).json({ error: 'body deve conter só { ativo: boolean }' })
    return
  }

  const servicoExistente = await getServicoById(req.params.id)
  if (!servicoExistente) {
    res.status(404).json({ error: 'Serviço não encontrado' })
    return
  }

  const servico = await updateServicoAtivo(req.params.id, ativo)
  res.json(servico)
}
