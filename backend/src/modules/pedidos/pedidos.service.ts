import { PedidoStatus, type Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { duracaoDoServico } from '../servicos/servicos.service.js'
import { validarHorarioPedido, type DadosCriacaoPedido, type ErroPedido } from './pedidos.validation.js'

// I17: no painel o lava-rápido vem sempre do token (`req.auth.id`), nunca do navegador.
// I13: na criação o cliente vem do token de cliente (`req.auth.id`).

/** Formato de resposta de pedido (painel e app): cliente, veículo e serviços comprados. */
export const includePedido = {
  cliente: { select: { id: true, nome: true } },
  veiculo: { select: { id: true, marca: true, modelo: true, cor: true, placa: true } },
  servicos: {
    select: { id: true, servicoId: true, nome: true, preco: true, duracaoMinutos: true },
    orderBy: { ordem: 'asc' },
  },
} satisfies Prisma.PedidoInclude

export function listPedidos(lavaRapidoId: string) {
  return prisma.pedido.findMany({
    where: { lavaRapidoId },
    include: includePedido,
    orderBy: { horario: 'desc' },
  })
}

/** Atualiza o status só se o pedido for da empresa; senão devolve `null`. */
export async function updatePedidoStatus(id: string, lavaRapidoId: string, status: PedidoStatus) {
  const { count } = await prisma.pedido.updateMany({ where: { id, lavaRapidoId }, data: { status } })
  if (count === 0) return null
  return prisma.pedido.findUnique({ where: { id }, include: includePedido })
}

export type ResultadoCriacaoPedido =
  | { ok: true; pedido: Prisma.PedidoGetPayload<{ include: typeof includePedido }> }
  | { ok: false; erro: ErroPedido }

/**
 * Cria o pedido do cliente (I13), numa transação:
 * - lava-rápido existe (senão 404);
 * - veículo existe e é do cliente (senão 404 — não revela veículo de outro);
 * - cada serviço existe, está ativo e é do lava-rápido (senão 400 com os ids);
 * - preço total e duração calculados AQUI a partir dos serviços (o que o app
 *   mandar de preço é ignorado), nome/preço/duração de cada serviço congelados
 *   em `PedidoServico`;
 * - `validarHorarioPedido` (I20 completa) antes de gravar;
 * - status `pendente`.
 */
export async function criarPedido(
  clienteId: string,
  dados: DadosCriacaoPedido,
  agora: Date = new Date(),
): Promise<ResultadoCriacaoPedido> {
  return prisma.$transaction(async (tx) => {
    const lavaRapido = await tx.lavaRapido.findUnique({ where: { id: dados.lavaRapidoId }, select: { id: true } })
    if (!lavaRapido) {
      return falha({ status: 404, error: 'Lava-rápido não encontrado', codigo: 'LAVA_RAPIDO_NAO_ENCONTRADO' })
    }

    const veiculo = await tx.veiculo.findFirst({ where: { id: dados.veiculoId, clienteId }, select: { id: true } })
    if (!veiculo) {
      return falha({ status: 404, error: 'Veículo não encontrado', codigo: 'VEICULO_NAO_ENCONTRADO' })
    }

    const encontrados = await tx.servico.findMany({
      where: { id: { in: dados.servicoIds } },
      include: { itens: { include: { item: { select: { duracaoMinutos: true } } } } },
    })
    const porId = new Map(encontrados.map((servico) => [servico.id, servico]))
    const servicoIdsInvalidos = dados.servicoIds.filter((id) => {
      const servico = porId.get(id)
      return !servico || !servico.ativo || servico.lavaRapidoId !== dados.lavaRapidoId
    })
    if (servicoIdsInvalidos.length > 0) {
      return falha({
        status: 400,
        error: 'Serviço indisponível: inexistente, inativo ou de outro lava-rápido',
        codigo: 'SERVICO_INVALIDO',
        servicoIdsInvalidos,
      })
    }

    // Na ordem em que o cliente escolheu.
    const itens = dados.servicoIds.map((id, ordem) => {
      const servico = porId.get(id)!
      return {
        servicoId: servico.id,
        nome: servico.nome,
        preco: servico.preco,
        duracaoMinutos: duracaoDoServico(servico.itens.map(({ item }) => item)),
        ordem,
      }
    })
    // Arredondado em centavos (soma de Float pode dar 85.39999…).
    const precoTotal = Math.round(itens.reduce((total, item) => total + item.preco, 0) * 100) / 100
    const duracaoMinutos = itens.reduce((total, item) => total + item.duracaoMinutos, 0)

    const erroHorario = await validarHorarioPedido(dados.lavaRapidoId, dados.horario, duracaoMinutos, agora)
    if (erroHorario) return falha(erroHorario)

    const pedido = await tx.pedido.create({
      data: {
        lavaRapidoId: dados.lavaRapidoId,
        clienteId,
        veiculoId: veiculo.id,
        horario: dados.horario,
        status: PedidoStatus.pendente,
        precoTotal,
        duracaoMinutos,
        servicos: { create: itens },
      },
      include: includePedido,
    })
    return { ok: true as const, pedido }
  })
}

function falha(erro: ErroPedido): ResultadoCriacaoPedido {
  return { ok: false, erro }
}
