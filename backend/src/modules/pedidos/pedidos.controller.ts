import type { Request, Response } from 'express'
import { criarPedido, listPedidos, updatePedidoStatus } from './pedidos.service.js'
import { isValidStatus, validarCriacaoPedido, type ErroPedido } from './pedidos.validation.js'

// Rotas do painel (autenticar('lavaRapido')): a empresa é `req.auth.id`.
// `?lavaRapidoId=` é ignorado; pedido de outra empresa = 404.
// Criação (autenticar('cliente'), I13): o cliente é `req.auth.id`.

function responderErro(res: Response, { status, ...corpo }: ErroPedido) {
  res.status(status).json(corpo)
}

/** POST /pedidos — cliente logado cria o pedido; preço/duração calculados no servidor. */
export async function create(req: Request, res: Response) {
  const validacao = validarCriacaoPedido(req.body)
  if ('erro' in validacao) {
    responderErro(res, validacao.erro)
    return
  }

  const resultado = await criarPedido(req.auth!.id, validacao.dados)
  if (!resultado.ok) {
    responderErro(res, resultado.erro)
    return
  }
  res.status(201).json(resultado.pedido)
}

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
