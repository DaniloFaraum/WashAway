import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { registrarParaLimpeza } from './limpeza.js'

// Factories de dados de teste. Cada uma:
// - gera valores únicos (CNPJ, nome do item, placa) pra arquivos/execuções não
//   colidirem em campos @unique;
// - aceita `overrides` com qualquer campo do model;
// - registra o id criado em `limpeza.ts` (basta `limparDadosDeTeste()` no afterAll).
//

let sequencia = 0

/** Sufixo único dentro do processo e, com alta probabilidade, entre execuções. */
export function sufixoUnico(): string {
  sequencia += 1
  return `${process.pid}-${sequencia}-${randomInt(1000, 9999)}`
}

function digitos(tamanho: number): string {
  return Array.from({ length: tamanho }, () => randomInt(0, 10)).join('')
}

/** CNPJ só com dígitos (14), aleatório. Não tem dígito verificador válido. */
export function cnpjUnico(): string {
  return digitos(14)
}

/** Placa no formato Mercosul (AAA0A00), aleatória. */
export function placaUnica(): string {
  const letra = () => String.fromCharCode(65 + randomInt(0, 26))
  return `${letra()}${letra()}${letra()}${randomInt(0, 10)}${letra()}${digitos(2)}`
}

type LavaRapidoOverrides = Partial<Omit<Prisma.LavaRapidoUncheckedCreateInput, 'senha'>> & {
  /** Senha em texto puro; a factory grava o hash bcrypt (útil pra testar login). */
  senha?: string
}

export async function criarLavaRapidoTeste(overrides: LavaRapidoOverrides = {}) {
  const { senha, ...resto } = overrides
  const lavaRapido = await prisma.lavaRapido.create({
    data: {
      name: `Lava-rápido de teste ${sufixoUnico()}`,
      cnpj: cnpjUnico(),
      senha: senha ? await bcrypt.hash(senha, 4) : 'hash-fake-nao-usado-nestes-testes',
      rating: 4.5,
      reviewsCount: 10,
      distance: '1 km',
      time: '5 min',
      price: 50,
      isOpen: true,
      image: 'https://placehold.co/300x300?text=Teste',
      latitude: 0,
      longitude: 0,
      ...resto,
    },
  })
  registrarParaLimpeza('lavaRapido', lavaRapido.id)
  return lavaRapido
}

export async function criarItemServicoTeste(overrides: Partial<Prisma.ItemServicoUncheckedCreateInput> = {}) {
  const item = await prisma.itemServico.create({
    data: {
      nome: `Item de teste ${sufixoUnico()}`,
      descricao: 'teste',
      categoria: 'Categoria de teste',
      duracaoMinutos: 15,
      ...overrides,
    },
  })
  registrarParaLimpeza('itemServico', item.id)
  return item
}

type ServicoOverrides = Partial<Omit<Prisma.ServicoUncheckedCreateInput, 'lavaRapidoId' | 'itens'>> & {
  /** Ids de ItemServico que compõem o combo. */
  itemIds?: string[]
}

export async function criarServicoTeste(lavaRapidoId: string, overrides: ServicoOverrides = {}) {
  const { itemIds = [], ...resto } = overrides
  const servico = await prisma.servico.create({
    data: {
      lavaRapidoId,
      nome: `Serviço de teste ${sufixoUnico()}`,
      preco: 50,
      ...resto,
      itens: { create: itemIds.map((itemId) => ({ itemId })) },
    },
  })
  registrarParaLimpeza('servico', servico.id)
  return servico
}

/**
 * Pedido no formato do I13. Sem `clienteId`/`veiculoId`, cria um cliente e um
 * veículo de teste (registrados para limpeza); sem `servicos`, grava um item
 * "Lavagem de teste" (R$ 50, 30 min) com total/duração coerentes.
 */
export async function criarPedidoTeste(
  lavaRapidoId: string,
  overrides: Partial<Omit<Prisma.PedidoUncheckedCreateInput, 'lavaRapidoId'>> = {},
) {
  let { clienteId, veiculoId } = overrides
  if (!clienteId) clienteId = (await criarClienteTeste()).id
  if (!veiculoId) veiculoId = (await criarVeiculoTeste(clienteId)).id

  const pedido = await prisma.pedido.create({
    data: {
      lavaRapidoId,
      horario: new Date('2026-01-01T10:00:00.000Z'),
      status: 'pendente',
      fotos: [],
      precoTotal: 50,
      duracaoMinutos: 30,
      servicos: { create: [{ nome: 'Lavagem de teste', preco: 50, duracaoMinutos: 30 }] },
      ...overrides,
      clienteId,
      veiculoId,
    },
  })
  registrarParaLimpeza('pedido', pedido.id)
  return pedido
}

type ClienteOverrides = Partial<Omit<Prisma.ClienteUncheckedCreateInput, 'senha'>> & {
  /** Senha em texto puro; a factory grava o hash bcrypt (útil pra testar login). */
  senha?: string
}

/** Senha padrão dos clientes da factory (em texto puro, pra testar login). */
export const SENHA_CLIENTE_TESTE = 'senha-de-teste'

export async function criarClienteTeste(overrides: ClienteOverrides = {}) {
  const { senha = SENHA_CLIENTE_TESTE, ...resto } = overrides
  const cliente = await prisma.cliente.create({
    data: {
      nome: `Cliente de teste ${sufixoUnico()}`,
      email: `cliente-${sufixoUnico()}@teste.washaway.dev`,
      senha: await bcrypt.hash(senha, 4),
      ...resto,
    },
  })
  registrarParaLimpeza('cliente', cliente.id)
  return cliente
}

/** Veículo do cliente (I3), com placa Mercosul única. */
export async function criarVeiculoTeste(
  clienteId: string,
  overrides: Partial<Omit<Prisma.VeiculoUncheckedCreateInput, 'clienteId'>> = {},
) {
  const veiculo = await prisma.veiculo.create({
    data: {
      clienteId,
      marca: 'Marca de teste',
      modelo: `Modelo de teste ${sufixoUnico()}`,
      cor: 'Prata',
      placa: placaUnica(),
      ...overrides,
    },
  })
  registrarParaLimpeza('veiculo', veiculo.id)
  return veiculo
}
