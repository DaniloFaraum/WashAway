import type { Request, Response } from 'express'
import { isPedidoNotFoundError, isValidStatus, listPedidos, updatePedidoStatus } from './pedidos.service.js'

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

  try {
    const pedido = await updatePedidoStatus(req.params.id, status)
    res.json(pedido)
  } catch (error) {
    if (isPedidoNotFoundError(error)) {
      res.status(404).json({ error: 'Pedido não encontrado' })
      return
    }
    throw error
  }
}
