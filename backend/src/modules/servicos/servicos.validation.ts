import type { DadosServico } from './servicos.service.js'

export const NOME_SERVICO_MAX = 60

/**
 * Valida o formato de `{ nome, preco, itemIds }` (a existência dos itens no
 * catálogo é checada à parte, no banco).
 * @returns a mensagem de erro, ou `null` se o body for válido
 */
export function validarDadosServico(body: any): string | null {
  const { nome, preco, itemIds } = body ?? {}

  if (typeof nome !== 'string' || nome.trim() === '') {
    return 'nome é obrigatório'
  }
  if (nome.trim().length > NOME_SERVICO_MAX) {
    return `nome deve ter até ${NOME_SERVICO_MAX} caracteres`
  }
  if (typeof preco !== 'number' || !Number.isFinite(preco) || preco <= 0) {
    return 'preco deve ser um número maior que zero'
  }
  if (!Array.isArray(itemIds) || itemIds.length === 0 || !itemIds.every((id) => typeof id === 'string')) {
    return 'itemIds deve ser uma lista não vazia de ids do catálogo'
  }
  if (new Set(itemIds).size !== itemIds.length) {
    return 'itemIds não pode ter itens repetidos'
  }
  return null
}

export function toDadosServico(body: any): DadosServico {
  return { nome: body.nome.trim(), preco: body.preco, itemIds: body.itemIds }
}
