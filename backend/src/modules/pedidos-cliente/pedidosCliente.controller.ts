import type { Request, Response } from 'express'
import {
  contarRecusasNaoVistas,
  getPedidoDoCliente,
  listarPedidosDoCliente,
  marcarRecusaVista,
} from './pedidosCliente.service.js'

// Rotas de /clientes/me/pedidos e /clientes/me/notificacoes (I18) — todas com
// autenticar('cliente'); o cliente vem sempre do token (`req.auth.id`).

const NAO_ENCONTRADO = { error: 'Pedido não encontrado', codigo: 'PEDIDO_NAO_ENCONTRADO' }

/** GET /clientes/me/pedidos */
export async function listar(req: Request, res: Response) {
  res.json(await listarPedidosDoCliente(req.auth!.id))
}

/** GET /clientes/me/pedidos/:id */
export async function detalhe(req: Request, res: Response) {
  const pedido = await getPedidoDoCliente(req.auth!.id, req.params.id)
  if (!pedido) {
    res.status(404).json(NAO_ENCONTRADO)
    return
  }
  res.json(pedido)
}

/** POST /clientes/me/pedidos/:id/visto */
export async function marcarVisto(req: Request, res: Response) {
  if (!(await marcarRecusaVista(req.auth!.id, req.params.id))) {
    res.status(404).json(NAO_ENCONTRADO)
    return
  }
  res.status(204).end()
}

/** GET /clientes/me/notificacoes */
export async function notificacoes(req: Request, res: Response) {
  res.json({ recusasNaoVistas: await contarRecusasNaoVistas(req.auth!.id) })
}
