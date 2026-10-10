import type { Request, Response } from 'express'
import { listPedidos, updatePedidoStatus } from './pedidos.service.js'
import { isValidStatus } from './pedidos.validation.js'

// Rotas do painel (autenticar('lavaRapido')): a empresa é `req.auth.id`.
// `?lavaRapidoId=` é ignorado; pedido de outra empresa = 404.

export async function index(req: Request, res: Response) {
  const pedidos = await listPedidos(req.auth!.id)
  res.json(pedidos)
}

export async function updateStatus(req: Request, res: Response) {
  const { status } = req.body ?? {}

  if (!isValidStatus(status)) {
    res.status(400).json({ error: 'status inválido' })
    return
  }

  const pedido = await updatePedidoStatus(req.params.id, req.auth!.id, status)
  if (!pedido) {
    res.status(404).json({ error: 'Pedido não encontrado' })
    return
  }
  res.json(pedido)
}
