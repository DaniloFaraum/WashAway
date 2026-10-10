import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import {
  atualizarVeiculoDoCliente,
  criarVeiculoDoCliente,
  listarVeiculosDoCliente,
  removerVeiculoDoCliente,
} from './veiculosCliente.service.js'
import { validarVeiculo, type DadosVeiculo } from './veiculosCliente.validation.js'

// Rotas de /clientes/me/veiculos — todas com autenticar('cliente'); o cliente
// vem sempre do token (`req.auth.id`), nunca do body/URL.

const NAO_ENCONTRADO = 'Veículo não encontrado'
const PLACA_REPETIDA = 'Você já cadastrou um veículo com essa placa'

/** Dados limpos do body, ou `undefined` depois de responder `400 { error, campos }`. */
function dadosValidosOu400(req: Request, res: Response): DadosVeiculo | undefined {
  const { erros, dados } = validarVeiculo(req.body)
  if (!dados) res.status(400).json({ error: 'Dados do veículo inválidos', campos: erros })
  return dados
}

/** `P2002` (placa já cadastrada pelo cliente) vira `409`; qualquer outro erro é relançado. */
function tratarPlacaRepetida(error: unknown, res: Response) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    res.status(409).json({ error: PLACA_REPETIDA })
    return
  }
  throw error
}

/** GET /clientes/me/veiculos */
export async function listar(req: Request, res: Response) {
  res.json(await listarVeiculosDoCliente(req.auth!.id))
}

/** POST /clientes/me/veiculos */
export async function criar(req: Request, res: Response) {
  const dados = dadosValidosOu400(req, res)
  if (!dados) return
  try {
    res.status(201).json(await criarVeiculoDoCliente(req.auth!.id, dados))
  } catch (error) {
    tratarPlacaRepetida(error, res)
  }
}

/** PUT /clientes/me/veiculos/:id */
export async function atualizar(req: Request, res: Response) {
  const dados = dadosValidosOu400(req, res)
  if (!dados) return
  try {
    const veiculo = await atualizarVeiculoDoCliente(req.auth!.id, req.params.id, dados)
    if (!veiculo) {
      res.status(404).json({ error: NAO_ENCONTRADO })
      return
    }
    res.json(veiculo)
  } catch (error) {
    tratarPlacaRepetida(error, res)
  }
}

/** DELETE /clientes/me/veiculos/:id */
export async function remover(req: Request, res: Response) {
  if (!(await removerVeiculoDoCliente(req.auth!.id, req.params.id))) {
    res.status(404).json({ error: NAO_ENCONTRADO })
    return
  }
  res.status(204).end()
}
