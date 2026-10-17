import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { classificarPedido, type QuandoPedido } from './classificarPedido.js'

// Pedidos do cliente logado (I18), em /clientes/me/pedidos. Toda busca filtra
// por `clienteId` do token: pedido de outro cliente é tratado como inexistente.

const includePedidoCliente = {
  lavaRapido: { select: { id: true, name: true, address: true } },
  veiculo: { select: { id: true, marca: true, modelo: true, cor: true, placa: true } },
  servicos: {
    select: { id: true, servicoId: true, nome: true, preco: true, duracaoMinutos: true },
    orderBy: { ordem: 'asc' },
  },
} satisfies Prisma.PedidoInclude

type PedidoComRelacoes = Prisma.PedidoGetPayload<{ include: typeof includePedidoCliente }>

export type PedidoDoCliente = {
  id: string
  status: PedidoComRelacoes['status']
  horario: Date
  precoTotal: number
  duracaoMinutos: number
  criadoEm: Date
  statusAlteradoEm: Date | null
  motivoRecusa: string | null
  recusaVistaEm: Date | null
  quando: QuandoPedido
  lavaRapido: { id: string; nome: string; endereco: string | null }
  veiculo: PedidoComRelacoes['veiculo']
  servicos: PedidoComRelacoes['servicos']
}

/** Formato da resposta: só o que a cliente precisa (sem fotos/ids internos do painel), com `quando`. */
function paraResposta(pedido: PedidoComRelacoes, agora: Date): PedidoDoCliente {
  return {
    id: pedido.id,
    status: pedido.status,
    horario: pedido.horario,
    precoTotal: pedido.precoTotal,
    duracaoMinutos: pedido.duracaoMinutos,
    criadoEm: pedido.criadoEm,
    statusAlteradoEm: pedido.statusAlteradoEm,
    motivoRecusa: pedido.motivoRecusa,
    recusaVistaEm: pedido.recusaVistaEm,
    quando: classificarPedido(pedido, agora),
    lavaRapido: { id: pedido.lavaRapido.id, nome: pedido.lavaRapido.name, endereco: pedido.lavaRapido.address },
    veiculo: pedido.veiculo,
    servicos: pedido.servicos,
  }
}

/** Pedidos do cliente, do horário mais cedo para o mais tarde. */
export async function listarPedidosDoCliente(clienteId: string, agora: Date = new Date()): Promise<PedidoDoCliente[]> {
  const pedidos = await prisma.pedido.findMany({
    where: { clienteId },
    include: includePedidoCliente,
    orderBy: [{ horario: 'asc' }, { criadoEm: 'asc' }],
  })
  return pedidos.map((pedido) => paraResposta(pedido, agora))
}

/** Pedido `id` se for do cliente; `null` se não existir ou for de outro. */
export async function getPedidoDoCliente(clienteId: string, id: string, agora: Date = new Date()): Promise<PedidoDoCliente | null> {
  const pedido = await prisma.pedido.findFirst({ where: { id, clienteId }, include: includePedidoCliente })
  return pedido ? paraResposta(pedido, agora) : null
}

/** Quantos pedidos recusados o cliente ainda não viu (contador do botão de conta). */
export function contarRecusasNaoVistas(clienteId: string): Promise<number> {
  return prisma.pedido.count({ where: { clienteId, status: 'recusado', recusaVistaEm: null } })
}

/**
 * Marca a recusa do pedido como vista. `false` se o pedido não for do cliente.
 * Idempotente: só grava em pedido `recusado` ainda não visto (os outros ficam como estão).
 */
export async function marcarRecusaVista(clienteId: string, id: string, agora: Date = new Date()): Promise<boolean> {
  const existe = await prisma.pedido.findFirst({ where: { id, clienteId }, select: { id: true } })
  if (!existe) return false
  await prisma.pedido.updateMany({ where: { id, clienteId, status: 'recusado', recusaVistaEm: null }, data: { recusaVistaEm: agora } })
  return true
}
