import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { omitSenha } from '../lava-rapidos/lavaRapidos.service.js'
import { isValidCnpj } from '../lava-rapidos/lavaRapidos.validation.js'
import { aceitarContrato, getSolicitacaoById, solicitar } from './onboarding.service.js'
import { isAceiteValido, TEXTO_ACEITE } from './onboarding.validation.js'

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

  const resultado = await solicitar({ name, address, cnpj })

  switch (resultado.tipo) {
    case 'cnpj_ja_cadastrado':
      res.status(409).json({ error: 'Já existe uma empresa cadastrada com esse cnpj' })
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
      case 'aceita':
        res.status(201).json(omitSenha(resultado.lavaRapido))
    }
  } catch (error) {
    // CNPJ cadastrado por outro caminho (ex.: POST /lavaRapidos legado) entre a solicitação e o aceite.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Já existe uma empresa cadastrada com esse cnpj' })
      return
    }
    throw error
  }
}
