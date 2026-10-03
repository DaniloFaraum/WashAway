import type { Request, Response } from 'express'
import { getStringQueryParam } from '../../utils/queryParam.js'
import { getLavaRapidoById } from '../lava-rapidos/lavaRapidos.service.js'
import {
  atualizarServico,
  criarServico,
  findItemIdsInvalidos,
  getServicoById,
  listServicos,
  updateServicoAtivo,
} from './servicos.service.js'
import { toDadosServico, validarDadosServico } from './servicos.validation.js'

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

/**
 * Valida formato + itens no catálogo; responde 400 e devolve `false` se inválido.
 */
async function validarBody(req: Request, res: Response) {
  const erro = validarDadosServico(req.body)
  if (erro) {
    res.status(400).json({ error: erro })
    return false
  }

  const itemIdsInvalidos = await findItemIdsInvalidos(req.body.itemIds)
  if (itemIdsInvalidos.length > 0) {
    res.status(400).json({ error: 'itens inexistentes ou inativos no catálogo', itemIdsInvalidos })
    return false
  }
  return true
}

export async function create(req: Request, res: Response) {
  const { lavaRapidoId } = req.body ?? {}
  if (typeof lavaRapidoId !== 'string' || lavaRapidoId === '') {
    res.status(400).json({ error: 'lavaRapidoId é obrigatório' })
    return
  }

  if (!(await validarBody(req, res))) return

  const lavaRapido = await getLavaRapidoById(lavaRapidoId)
  if (!lavaRapido) {
    res.status(404).json({ error: 'Lava-rápido não encontrado' })
    return
  }

  const servico = await criarServico(lavaRapidoId, toDadosServico(req.body))
  res.status(201).json(servico)
}

export async function update(req: Request, res: Response) {
  if (!(await validarBody(req, res))) return

  const servicoExistente = await getServicoById(req.params.id)
  if (!servicoExistente) {
    res.status(404).json({ error: 'Serviço não encontrado' })
    return
  }

  const servico = await atualizarServico(req.params.id, toDadosServico(req.body))
  res.json(servico)
}
