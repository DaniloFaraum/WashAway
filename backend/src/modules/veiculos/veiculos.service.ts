import { prisma } from '../../config/prisma.js'

/**
 * Veículos atendidos pela empresa (painel): os veículos distintos dos pedidos
 * do lava-rápido, pela relação `Pedido → Veiculo` (I13), por modelo e placa.
 */
export async function listVeiculos(lavaRapidoId: string) {
  const veiculos = await prisma.veiculo.findMany({
    where: { pedidos: { some: { lavaRapidoId } } },
    select: { id: true, marca: true, modelo: true, cor: true, placa: true },
    orderBy: [{ modelo: 'asc' }, { placa: 'asc' }],
  })
  return veiculos
}
