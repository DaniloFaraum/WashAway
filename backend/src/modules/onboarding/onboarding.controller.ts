import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { sessaoDoLavaRapido } from '../lava-rapidos/lavaRapidos.service.js'
import { isValidCnpj } from '../lava-rapidos/lavaRapidos.validation.js'
import { aceitarContrato, getSolicitacaoById, solicitar } from './onboarding.service.js'
import {
  isAceiteValido,
  normalizarEmailLavaRapido,
  TEXTO_ACEITE,
  validarEmailLavaRapido,
  validarSenhaLavaRapido,
} from './onboarding.validation.js'

// Nunca logar o body da solicitação: ele traz a senha em texto puro.

const EMAIL_JA_CADASTRADO = 'Já existe uma empresa cadastrada com esse e-mail'
const CNPJ_JA_CADASTRADO = 'Já existe uma empresa cadastrada com esse cnpj'

export async function create(req: Request, res: Response) {
  const { name, address, cnpj, email, senha } = req.body ?? {}

  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'name é obrigatório' })
    return
  }

  if (!isValidCnpj(cnpj)) {
    res.status(400).json({ error: 'cnpj inválido — precisa ter 14 dígitos numéricos' })
    return
  }

  const erroEmail = validarEmailLavaRapido(email)
  if (erroEmail) {
    res.status(400).json({ error: erroEmail })
    return
  }

  const erroSenha = validarSenhaLavaRapido(senha)
  if (erroSenha) {
    res.status(400).json({ error: erroSenha })
    return
  }

  const resultado = await solicitar({ name, address, cnpj, email: normalizarEmailLavaRapido(email), senha })

  switch (resultado.tipo) {
    case 'cnpj_ja_cadastrado':
      res.status(409).json({ error: CNPJ_JA_CADASTRADO })
      return
    case 'email_ja_cadastrado':
      res.status(409).json({ error: EMAIL_JA_CADASTRADO })
      return
    case 'sem_contrato_vigente':
      res.status(503).json({ error: 'Nenhum contrato vigente disponível para o onboarding' })
      return
    case 'existente':
      res.status(200).json(resultado.solicitacao)
      return
    case 'criada':
      res.status(201).json(resultado.solicitacao)
  }
}

export async function show(req: Request, res: Response) {
  const solicitacao = await getSolicitacaoById(req.params.id)
  if (!solicitacao) {
    res.status(404).json({ error: 'Solicitação não encontrada' })
    return
  }
  res.json(solicitacao)
}

/** POST /onboarding/solicitacoes/:id/aceite → 201 `{ token, expiraEm, lavaRapido }` (já entra no painel). */
export async function aceite(req: Request, res: Response) {
  if (!isAceiteValido(req.body?.aceite)) {
    res.status(400).json({ error: `Para assinar, envie { aceite: "${TEXTO_ACEITE}" }` })
    return
  }

  try {
    const resultado = await aceitarContrato(req.params.id)

    switch (resultado.tipo) {
      case 'nao_encontrada':
        res.status(404).json({ error: 'Solicitação não encontrada' })
        return
      case 'ja_concluida':
        res.status(409).json({ error: 'Contrato já assinado para esta solicitação' })
        return
      case 'sem_senha':
        res.status(409).json({
          error: 'Esta solicitação não tem e-mail e senha de acesso — envie o cadastro de novo, informando e-mail e senha.',
        })
        return
      case 'aceita':
        res.status(201).json(await sessaoDoLavaRapido(resultado.lavaRapido.id))
    }
  } catch (error) {
    // CNPJ/e-mail cadastrado por outro caminho entre a solicitação e o aceite.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const campos = ([] as string[]).concat((error.meta?.target as string[] | string | undefined) ?? [])
      const ehEmail = campos.some((campo) => campo.includes('email'))
      res.status(409).json({ error: ehEmail ? EMAIL_JA_CADASTRADO : CNPJ_JA_CADASTRADO })
      return
    }
    throw error
  }
}
