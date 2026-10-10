import type { Request, Response } from 'express'
import { isViolacaoDeUnicidade } from '../../utils/prismaErros.js'
import { assinarToken, expiracaoDoToken } from '../../auth/token.js'
import {
  autenticarCliente,
  criarCliente,
  getClienteById,
  omitSenhaCliente,
} from './clientes.service.js'
import { validarCadastroCliente } from './clientes.validation.js'

// Nunca logar o body nestas rotas: ele traz a senha em texto puro.

const CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos'

/** POST /auth/cliente/cadastro */
export async function cadastro(req: Request, res: Response) {
  const { erros, dados } = validarCadastroCliente(req.body)
  if (!dados) {
    res.status(400).json({ error: 'Dados de cadastro inválidos', campos: erros })
    return
  }

  try {
    const cliente = await criarCliente(dados)
    res.status(201).json(omitSenhaCliente(cliente))
  } catch (error) {
    if (isViolacaoDeUnicidade(error)) {
      res.status(409).json({ error: 'Este e-mail já está cadastrado' })
      return
    }
    throw error
  }
}

/** POST /auth/cliente/login */
export async function login(req: Request, res: Response) {
  const { email, senha } = req.body ?? {}
  if (typeof email !== 'string' || typeof senha !== 'string' || email.trim() === '' || senha === '') {
    res.status(401).json({ error: CREDENCIAIS_INVALIDAS })
    return
  }

  const cliente = await autenticarCliente(email, senha)
  if (!cliente) {
    res.status(401).json({ error: CREDENCIAIS_INVALIDAS })
    return
  }

  const token = assinarToken({ id: cliente.id, tipo: 'cliente' })
  res.json({ token, expiraEm: expiracaoDoToken(token), cliente: omitSenhaCliente(cliente) })
}

/** GET /clientes/me (autenticar('cliente')) */
export async function me(req: Request, res: Response) {
  const cliente = await getClienteById(req.auth!.id)
  if (!cliente) {
    // Token válido de um cliente que não existe mais: a sessão não vale.
    res.status(401).json({ error: 'Sessão inválida' })
    return
  }
  res.json(omitSenhaCliente(cliente))
}
