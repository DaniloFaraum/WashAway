import { prisma } from '../../config/prisma.js'
import type { DadosVeiculo } from './veiculosCliente.validation.js'

// Veículos do cliente do app (I3). Toda busca/alteração filtra por
// `{ id, clienteId }`: veículo de outro cliente é tratado como inexistente.

export function listarVeiculosDoCliente(clienteId: string) {
  return prisma.veiculo.findMany({ where: { clienteId }, orderBy: { criadoEm: 'asc' } })
}

/** Veículo `veiculoId` se ele for do cliente; `null` se não existir ou for de outro (o I13 usa para validar a posse). */
export function getVeiculoDoCliente(clienteId: string, veiculoId: string) {
  return prisma.veiculo.findFirst({ where: { id: veiculoId, clienteId } })
}

/** Lança P2002 se o cliente já tiver a placa. */
export function criarVeiculoDoCliente(clienteId: string, dados: DadosVeiculo) {
  return prisma.veiculo.create({ data: { ...dados, clienteId } })
}

/** Veículo atualizado, ou `null` se não for do cliente. Lança P2002 se a nova placa já for de outro veículo dele. */
export async function atualizarVeiculoDoCliente(clienteId: string, veiculoId: string, dados: DadosVeiculo) {
  const { count } = await prisma.veiculo.updateMany({ where: { id: veiculoId, clienteId }, data: dados })
  return count === 0 ? null : getVeiculoDoCliente(clienteId, veiculoId)
}

/** `true` se removeu; `false` se o veículo não for do cliente. */
export async function removerVeiculoDoCliente(clienteId: string, veiculoId: string) {
  const { count } = await prisma.veiculo.deleteMany({ where: { id: veiculoId, clienteId } })
  return count > 0
}
