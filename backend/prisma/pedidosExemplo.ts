import type { PedidoStatus, PrismaClient } from '@prisma/client'

// Pedidos de exemplo no formato do I13 (seed.ts e demo.ts): cliente + veículo
// do cadastro e os serviços do lava-rápido congelados em `PedidoServico`, com
// total e duração somados aqui — a mesma regra do `criarPedido` do backend
// (src/modules/pedidos/pedidos.service.ts), mas sem as validações de rota
// (pedidos de exemplo podem estar no passado e em qualquer status).

export type PedidoExemplo = {
  lavaRapidoId: string
  clienteId: string
  veiculoId: string
  /** Nomes dos serviços (combos) do lava-rápido, na ordem da compra. */
  servicos: string[]
  horario: Date
  status: PedidoStatus
  fotos?: string[]
  /** Só em `recusado` (I15). */
  motivoRecusa?: string
  /** Data da mudança de status (I15); padrão: o próprio `horario` (fora de `pendente`). */
  statusAlteradoEm?: Date
}

export async function criarPedidoExemplo(prisma: PrismaClient, pedido: PedidoExemplo) {
  const servicos = await prisma.servico.findMany({
    where: { lavaRapidoId: pedido.lavaRapidoId, nome: { in: pedido.servicos } },
    include: { itens: { include: { item: { select: { duracaoMinutos: true } } } } },
  })
  const porNome = new Map(servicos.map((servico) => [servico.nome, servico]))

  const itens = pedido.servicos.map((nome, ordem) => {
    const servico = porNome.get(nome)
    if (!servico) throw new Error(`Serviço "${nome}" não existe no lava-rápido ${pedido.lavaRapidoId}`)
    const duracaoMinutos = servico.itens.reduce((total, { item }) => total + item.duracaoMinutos, 0)
    return { servicoId: servico.id, nome: servico.nome, preco: servico.preco, duracaoMinutos, ordem }
  })

  return prisma.pedido.create({
    data: {
      lavaRapidoId: pedido.lavaRapidoId,
      clienteId: pedido.clienteId,
      veiculoId: pedido.veiculoId,
      horario: pedido.horario,
      status: pedido.status,
      // I15: pedido de exemplo fora de `pendente` já "mudou de status" — no horário do pedido.
      statusAlteradoEm: pedido.status === 'pendente' ? null : (pedido.statusAlteradoEm ?? pedido.horario),
      motivoRecusa: pedido.status === 'recusado' ? (pedido.motivoRecusa ?? null) : null,
      fotos: pedido.fotos ?? [],
      precoTotal: itens.reduce((total, item) => total + item.preco, 0),
      duracaoMinutos: itens.reduce((total, item) => total + item.duracaoMinutos, 0),
      servicos: { create: itens },
    },
  })
}

export type ClienteExemplo = {
  nome: string
  email: string
  /** Placa já normalizada (sem hífen, maiúsculas). */
  veiculos: { marca?: string; modelo: string; cor: string; placa: string }[]
}

/**
 * Cria (ou reaproveita, pelo e-mail) o cliente e os veículos dele (por placa),
 * sem duplicar nem apagar nada. Devolve o id do veículo de cada placa.
 */
export async function garantirClienteExemplo(prisma: PrismaClient, cliente: ClienteExemplo, senhaHash: string) {
  let registro = await prisma.cliente.findUnique({ where: { email: cliente.email } })
  const clienteNovo = !registro
  if (!registro) {
    registro = await prisma.cliente.create({ data: { nome: cliente.nome, email: cliente.email, senha: senhaHash } })
  }

  const veiculoIdPorPlaca = new Map<string, string>()
  let veiculosNovos = 0
  for (const veiculo of cliente.veiculos) {
    let existente = await prisma.veiculo.findUnique({
      where: { clienteId_placa: { clienteId: registro.id, placa: veiculo.placa } },
    })
    if (!existente) {
      existente = await prisma.veiculo.create({ data: { ...veiculo, marca: veiculo.marca ?? null, clienteId: registro.id } })
      veiculosNovos += 1
    }
    veiculoIdPorPlaca.set(veiculo.placa, existente.id)
  }

  return { clienteId: registro.id, clienteNovo, veiculosNovos, veiculoIdPorPlaca }
}
