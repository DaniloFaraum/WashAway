import type { Request, Response } from 'express'
import { criarPedido, listPedidos, updatePedidoStatus } from './pedidos.service.js'
import { validarCriacaoPedido, type ErroPedido } from './pedidos.validation.js'
import { validarAtualizacaoStatus, type ErroStatusPedido } from './pedidoStatus.js'

// Rotas do painel (autenticar('lavaRapido')): a empresa é `req.auth.id`.
// `?lavaRapidoId=` é ignorado; pedido de outra empresa = 404.
// Criação (autenticar('cliente'), I13): o cliente é `req.auth.id`.

function responderErro(res: Response, { status, ...corpo }: ErroPedido | ErroStatusPedido) {
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

/** PATCH /pedidos/:id — `{ status, motivo? }`, só nas transições permitidas (I15). */
export async function updateStatus(req: Request, res: Response) {
  const validacao = validarAtualizacaoStatus(req.body)
  if ('erro' in validacao) {
    responderErro(res, validacao.erro)
    return
  }

  const { status, motivo } = validacao.dados
  const resultado = await updatePedidoStatus(req.params.id, req.auth!.id, status, motivo)
  if (!resultado.ok) {
    responderErro(res, resultado.erro)
    return
  }
  res.json(resultado.pedido)
}
