import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import {
  autenticarLavaRapido,
  criarLavaRapido,
  getLavaRapidoById,
  listLavaRapidos,
  omitSenha,
} from './lavaRapidos.service.js'
import { isValidCnpj } from './lavaRapidos.validation.js'

export async function index(_req: Request, res: Response) {
  const lavaRapidos = await listLavaRapidos()
  res.json(lavaRapidos.map(omitSenha))
}

export async function show(req: Request, res: Response) {
  const lavaRapido = await getLavaRapidoById(req.params.id)
  if (!lavaRapido) {
    res.status(404).json({ error: 'Lava-rápido não encontrado' })
    return
  }
  res.json(omitSenha(lavaRapido))
}

export async function create(req: Request, res: Response) {
  const { name, address, cnpj } = req.body ?? {}

  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'name é obrigatório' })
    return
  }

  if (!isValidCnpj(cnpj)) {
    res.status(400).json({ error: 'cnpj inválido — precisa ter 14 dígitos numéricos' })
    return
  }

  try {
    const lavaRapido = await criarLavaRapido({ name, address, cnpj })
    res.status(201).json(omitSenha(lavaRapido))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Já existe uma empresa cadastrada com esse cnpj' })
      return
    }
    throw error
  }
}

export async function login(req: Request, res: Response) {
  const { cnpj, senha } = req.body ?? {}

  if (!isValidCnpj(cnpj) || typeof senha !== 'string' || senha === '') {
    res.status(401).json({ error: 'cnpj ou senha inválidos' })
    return
  }

  const lavaRapido = await autenticarLavaRapido(cnpj, senha)
  if (!lavaRapido) {
    res.status(401).json({ error: 'cnpj ou senha inválidos' })
    return
  }

  res.json(omitSenha(lavaRapido))
}
