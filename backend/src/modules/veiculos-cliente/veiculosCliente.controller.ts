import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import {
  atualizarVeiculoDoCliente,
  criarVeiculoDoCliente,
  listarVeiculosDoCliente,
  removerVeiculoDoCliente,
} from './veiculosCliente.service.js'
import { validarVeiculo } from './veiculosCliente.validation.js'

// Rotas de /clientes/me/veiculos — todas com autenticar('cliente'); o cliente
// vem sempre do token (`req.auth.id`), nunca do body/URL.

const NAO_ENCONTRADO = 'Veículo não encontrado'
const PLACA_REPETIDA = 'Você já cadastrou um veículo com essa placa'

function isPlacaRepetida(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

/** GET /clientes/me/veiculos */
export async function listar(req: Request, res: Response) {
  res.json(await listarVeiculosDoCliente(req.auth!.id))
}

/** POST /clientes/me/veiculos */
export async function criar(req: Request, res: Response) {
  const { erros, dados } = validarVeiculo(req.body)
  if (!dados) {
    res.status(400).json({ error: 'Dados do veículo inválidos', campos: erros })
    return
  }
  try {
    res.status(201).json(await criarVeiculoDoCliente(req.auth!.id, dados))
  } catch (error) {
    if (isPlacaRepetida(error)) {
      res.status(409).json({ error: PLACA_REPETIDA })
      return
    }
    throw error
  }
}

/** PUT /clientes/me/veiculos/:id */
export async function atualizar(req: Request, res: Response) {
  const { erros, dados } = validarVeiculo(req.body)
  if (!dados) {
    res.status(400).json({ error: 'Dados do veículo inválidos', campos: erros })
    return
  }
  try {
    const veiculo = await atualizarVeiculoDoCliente(req.auth!.id, req.params.id, dados)
    if (!veiculo) {
      res.status(404).json({ error: NAO_ENCONTRADO })
      return
    }
    res.json(veiculo)
  } catch (error) {
    if (isPlacaRepetida(error)) {
      res.status(409).json({ error: PLACA_REPETIDA })
      return
    }
    throw error
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
