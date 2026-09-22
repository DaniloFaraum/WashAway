import type { Request, Response } from 'express'
import { getPedidoById, listPedidos, updatePedidoStatus } from './pedidos.service.js'
import { isValidStatus } from './pedidos.validation.js'

export async function index(_req: Request, res: Response) {
  const pedidos = await listPedidos()
  res.json(pedidos)
}

export async function updateStatus(req: Request, res: Response) {
  const { status } = req.body ?? {}

  if (!isValidStatus(status)) {
    res.status(400).json({ error: 'status inválido' })
    return
  }

  const pedidoExistente = await getPedidoById(req.params.id)
  if (!pedidoExistente) {
    res.status(404).json({ error: 'Pedido não encontrado' })
    return
  }

  const pedido = await updatePedidoStatus(req.params.id, status)
  res.json(pedido)
}
