import { prisma } from '../../config/prisma.js'

interface VeiculoJson {
  modelo?: string
  placa?: string
}

export async function listVeiculos(lavaRapidoId?: string) {
  const pedidos = await prisma.pedido.findMany({
    where: lavaRapidoId ? { lavaRapidoId } : undefined,
    select: { veiculo: true },
  })

  const veiculosPorPlaca = new Map<string, { id: string; modelo: string; placa: string }>()
  for (const { veiculo } of pedidos) {
    const { modelo, placa } = (veiculo ?? {}) as VeiculoJson
    if (!placa || veiculosPorPlaca.has(placa)) continue
    veiculosPorPlaca.set(placa, { id: placa, modelo: modelo ?? '', placa })
  }

  return Array.from(veiculosPorPlaca.values())
}
