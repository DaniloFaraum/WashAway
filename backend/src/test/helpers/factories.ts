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
// `criarClienteTeste` (I1) e `criarVeiculoTeste` (I3) entram aqui junto com os
// models Cliente/Veiculo, seguindo o mesmo formato.

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

export async function criarPedidoTeste(
  lavaRapidoId: string,
  overrides: Partial<Omit<Prisma.PedidoUncheckedCreateInput, 'lavaRapidoId'>> = {},
) {
  const pedido = await prisma.pedido.create({
    data: {
      lavaRapidoId,
      veiculo: { modelo: 'Carro de Teste', placa: placaUnica() },
      servico: 'Lavagem de teste',
      horario: new Date('2026-01-01T10:00:00.000Z'),
      status: 'pendente',
      fotos: [],
      ...overrides,
    },
  })
  registrarParaLimpeza('pedido', pedido.id)
  return pedido
}
