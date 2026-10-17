import { prisma } from '../../config/prisma.js'

const includeItens = {
  itens: { include: { item: { select: { id: true, nome: true, categoria: true, duracaoMinutos: true } } } },
} as const

type ServicoComItens = NonNullable<Awaited<ReturnType<typeof findServicoComItens>>>

function findServicoComItens(id: string) {
  return prisma.servico.findUnique({ where: { id }, include: includeItens })
}

/**
 * Duração do combo = soma das durações dos seus itens (o combo não guarda
 * coluna própria). Usada na resposta da API e no cálculo do pedido (I13).
 */
export function duracaoDoServico(itens: { duracaoMinutos: number }[]): number {
  return itens.reduce((total, item) => total + item.duracaoMinutos, 0)
}

// Achata a tabela de ligação em `itens` e deriva dos itens as `categorias`
// (distintas) e a `duracaoMinutos` (soma) — o combo não guarda nenhuma das duas.
function toServicoResponse({ itens, ...servico }: ServicoComItens) {
  const itensPlanos = itens.map(({ item }) => item)
  const categorias = [...new Set(itensPlanos.map((item) => item.categoria))]
  return { ...servico, itens: itensPlanos, categorias, duracaoMinutos: duracaoDoServico(itensPlanos) }
}

export async function listServicos(lavaRapidoId?: string) {
  const servicos = await prisma.servico.findMany({
    where: lavaRapidoId ? { lavaRapidoId } : undefined,
    include: includeItens,
  })
  return servicos.map(toServicoResponse)
}

// Escrita (I17): só no serviço da empresa do token — `where: { id, lavaRapidoId }`;
// não encontrado (ou de outra empresa) devolve `null` (→ 404).

/** Ativa/desativa só se o serviço for da empresa; senão devolve `null`. */
export async function updateServicoAtivo(id: string, lavaRapidoId: string, ativo: boolean) {
  const { count } = await prisma.servico.updateMany({ where: { id, lavaRapidoId }, data: { ativo } })
  if (count === 0) return null
  return toServicoResponse((await findServicoComItens(id))!)
}

/**
 * @returns os ids de `itemIds` que não existem ou estão inativos no catálogo
 */
export async function findItemIdsInvalidos(itemIds: string[]) {
  const validos = await prisma.itemServico.findMany({
    where: { id: { in: itemIds }, ativo: true },
    select: { id: true },
  })
  const idsValidos = new Set(validos.map((item) => item.id))
  return itemIds.filter((id) => !idsValidos.has(id))
}

export type DadosServico = {
  nome: string
  preco: number
  itemIds: string[]
}

export async function criarServico(lavaRapidoId: string, { nome, preco, itemIds }: DadosServico) {
  const servico = await prisma.servico.create({
    data: {
      lavaRapidoId,
      nome,
      preco,
      itens: { create: itemIds.map((itemId) => ({ itemId })) },
    },
    include: includeItens,
  })
  return toServicoResponse(servico)
}

/** Atualiza só se o serviço for da empresa; senão devolve `null` (sem mexer nos itens). */
export async function atualizarServico(id: string, lavaRapidoId: string, { nome, preco, itemIds }: DadosServico) {
  const servico = await prisma.$transaction(async (tx) => {
    if (!(await tx.servico.findFirst({ where: { id, lavaRapidoId }, select: { id: true } }))) return null
    await tx.servicoItem.deleteMany({ where: { servicoId: id } })
    return tx.servico.update({
      where: { id },
      data: {
        nome,
        preco,
        itens: { create: itemIds.map((itemId) => ({ itemId })) },
      },
      include: includeItens,
    })
  })
  return servico && toServicoResponse(servico)
}
