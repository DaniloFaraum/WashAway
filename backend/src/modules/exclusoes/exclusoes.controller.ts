import type { Request, Response } from 'express'
import type { StatusSolicitacaoExclusao } from '@prisma/client'
import { getUsuarioInternoById } from '../internos/internos.service.js'
import {
  aprovarSolicitacao,
  cancelarSolicitacaoDaEmpresa,
  getSolicitacaoDaEmpresa,
  listarSolicitacoes,
  recusarSolicitacao,
  solicitarExclusao,
  STATUS_SOLICITACAO_EXCLUSAO,
  type DecisaoResultado,
} from './exclusoes.service.js'
import { textoOpcional } from './exclusoes.validation.js'

const SESSAO_INVALIDA = 'Sessão inválida'

// --- Empresa (autenticar('lavaRapido')): a empresa é `req.auth.id` ---

/** POST /lavaRapidos/me/solicitacao-exclusao { motivo? } */
export async function solicitar(req: Request, res: Response) {
  const motivo = textoOpcional(req.body?.motivo, 'motivo')
  if (!motivo.valido) {
    res.status(400).json({ error: motivo.erro })
    return
  }

  const resultado = await solicitarExclusao(req.auth!.id, motivo.valor)
  if (resultado.tipo === 'empresa_inexistente') {
    // Token válido de uma empresa que não existe mais: a sessão não vale.
    res.status(401).json({ error: SESSAO_INVALIDA })
    return
  }
  res.status(resultado.tipo === 'criada' ? 201 : 200).json(resultado.solicitacao)
}

/** GET /lavaRapidos/me/solicitacao-exclusao → a mais recente (qualquer status) */
export async function verDaEmpresa(req: Request, res: Response) {
  const solicitacao = await getSolicitacaoDaEmpresa(req.auth!.id)
  if (!solicitacao) {
    res.status(404).json({ error: 'Nenhuma solicitação de exclusão' })
    return
  }
  res.json(solicitacao)
}

/** DELETE /lavaRapidos/me/solicitacao-exclusao → cancela a pendente */
export async function cancelar(req: Request, res: Response) {
  const solicitacao = await cancelarSolicitacaoDaEmpresa(req.auth!.id)
  if (!solicitacao) {
    res.status(404).json({ error: 'Nenhuma solicitação de exclusão pendente' })
    return
  }
  res.json(solicitacao)
}

// --- Equipe interna (autenticar('interno') + autorizar('admin')) ---

function ehStatus(valor: unknown): valor is StatusSolicitacaoExclusao {
  return typeof valor === 'string' && (STATUS_SOLICITACAO_EXCLUSAO as string[]).includes(valor)
}

/** GET /interno/solicitacoes-exclusao?status= */
export async function listar(req: Request, res: Response) {
  const { status } = req.query
  if (status !== undefined && !ehStatus(status)) {
    res.status(400).json({ error: `status inválido (use ${STATUS_SOLICITACAO_EXCLUSAO.join(', ')})` })
    return
  }
  res.json(await listarSolicitacoes(status))
}

/** O interno do token ainda existe? (é ele quem vai em `decididoPorId`) */
async function internoDaSessao(req: Request, res: Response): Promise<string | null> {
  const interno = await getUsuarioInternoById(req.auth!.id)
  if (!interno) {
    res.status(401).json({ error: SESSAO_INVALIDA })
    return null
  }
  return interno.id
}

function responderDecisao(res: Response, resultado: DecisaoResultado) {
  if (resultado.tipo === 'nao_encontrada') {
    res.status(404).json({ error: 'Solicitação de exclusão não encontrada' })
    return
  }
  if (resultado.tipo === 'ja_decidida') {
    res.status(409).json({ error: `Solicitação já está ${resultado.solicitacao.status}` })
    return
  }
  res.json(resultado.solicitacao)
}

/** POST /interno/solicitacoes-exclusao/:id/aprovar → exclui a empresa */
export async function aprovar(req: Request, res: Response) {
  const internoId = await internoDaSessao(req, res)
  if (!internoId) return
  responderDecisao(res, await aprovarSolicitacao(req.params.id, internoId))
}

/** POST /interno/solicitacoes-exclusao/:id/recusar { observacao? } */
export async function recusar(req: Request, res: Response) {
  const observacao = textoOpcional(req.body?.observacao, 'observacao')
  if (!observacao.valido) {
    res.status(400).json({ error: observacao.erro })
    return
  }
  const internoId = await internoDaSessao(req, res)
  if (!internoId) return
  responderDecisao(res, await recusarSolicitacao(req.params.id, internoId, observacao.valor))
}
