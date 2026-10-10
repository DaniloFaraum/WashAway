import type { Request, Response } from 'express'
import {
  autenticarLavaRapido,
  dadosPublicos,
  getLavaRapidoById,
  listLavaRapidos,
  sessaoDoLavaRapido,
} from './lavaRapidos.service.js'
import { isValidCnpj } from './lavaRapidos.validation.js'

// I17: `POST /lavaRapidos` (cadastro legado com senha "admin") e
// `DELETE /lavaRapidos/:id` foram removidos — empresa nova só pelo onboarding;
// a exclusão passa a ser por solicitação (i17-interno-exclusao).

export async function index(_req: Request, res: Response) {
  const lavaRapidos = await listLavaRapidos()
  res.json(lavaRapidos.map(dadosPublicos))
}

export async function show(req: Request, res: Response) {
  const lavaRapido = await getLavaRapidoById(req.params.id)
  if (!lavaRapido) {
    res.status(404).json({ error: 'Lava-rápido não encontrado' })
    return
  }
  res.json(dadosPublicos(lavaRapido))
}

/** POST /lavaRapidos/login → `{ token, expiraEm, lavaRapido }` (nunca logar o body: tem a senha). */
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

  res.json(await sessaoDoLavaRapido(lavaRapido.id))
}
