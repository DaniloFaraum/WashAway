import { prisma } from '../../config/prisma.js'

const includeItens = {
  itens: { include: { item: { select: { id: true, nome: true, categoria: true, duracaoMinutos: true } } } },
} as const

type ServicoComItens = NonNullable<Awaited<ReturnType<typeof findServicoComItens>>>

function findServicoComItens(id: string) {
  return prisma.servico.findUnique({ where: { id }, include: includeItens })
}

// Achata a tabela de ligação em `itens` e deriva dos itens as `categorias`
// (distintas) e a `duracaoMinutos` (soma) — o combo não guarda nenhuma das duas.
function toServicoResponse({ itens, ...servico }: ServicoComItens) {
  const itensPlanos = itens.map(({ item }) => item)
  const categorias = [...new Set(itensPlanos.map((item) => item.categoria))]
  const duracaoMinutos = itensPlanos.reduce((total, item) => total + item.duracaoMinutos, 0)
  return { ...servico, itens: itensPlanos, categorias, duracaoMinutos }
}

export async function listServicos(lavaRapidoId?: string) {
  const servicos = await prisma.servico.findMany({
    where: lavaRapidoId ? { lavaRapidoId } : undefined,
    include: includeItens,
  })
  return servicos.map(toServicoResponse)
}

export function getServicoById(id: string) {
  return prisma.servico.findUnique({ where: { id } })
}

export async function updateServicoAtivo(id: string, ativo: boolean) {
  await prisma.servico.update({ where: { id }, data: { ativo } })
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

export async function atualizarServico(id: string, { nome, preco, itemIds }: DadosServico) {
  const servico = await prisma.$transaction(async (tx) => {
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
  return toServicoResponse(servico)
}
