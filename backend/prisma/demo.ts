import 'dotenv/config'
import { PrismaClient, type PedidoStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { SENHA_PADRAO } from '../src/modules/lava-rapidos/lavaRapidos.service.js'

// Dados de demonstração para apresentação. Diferente do seed.ts, este script
// NUNCA apaga nada: só insere, e pula toda empresa cujo CNPJ já existe — pode
// rodar quantas vezes quiser sem perder dados cadastrados pela UI.
// Pré-requisito: catálogo de itens e contrato vigente já no banco (seed.ts).

const prisma = new PrismaClient()
const SENHA_PADRAO_HASH = bcrypt.hashSync(SENHA_PADRAO, 10)

type Combo = { nome: string; preco: number; ativo?: boolean; itens: string[] }
type PedidoDemo = { modelo: string; placa: string; servico: string; horario: string; status: PedidoStatus; fotos?: number }
type IntercorrenciaDemo = { data: string; motivo: string; horaInicio?: string; horaFim?: string }

type EmpresaDemo = {
  name: string
  cnpj: string
  address: string
  rating: number
  reviewsCount: number
  distance: string
  time: string
  latitude: number
  longitude: number
  combos: Combo[]
  pedidos: PedidoDemo[]
  intercorrencias: IntercorrenciaDemo[]
}

// Feriados/folgas comuns a todas as empresas.
const FERIADOS: IntercorrenciaDemo[] = [
  { data: '2026-10-12', motivo: 'Feriado — Nossa Senhora Aparecida' },
  { data: '2026-11-02', motivo: 'Feriado — Finados' },
  { data: '2026-11-20', motivo: 'Feriado — Dia da Consciência Negra' },
]

const empresas: EmpresaDemo[] = [
  {
    name: 'Lava Jato Vila Madalena',
    cnpj: '45123987000110',
    address: 'Rua Harmonia, 455 - Vila Madalena, São Paulo - SP, CEP 05435000',
    rating: 4.9,
    reviewsCount: 212,
    distance: '1.1 km',
    time: '6 min',
    latitude: -23.5558,
    longitude: -46.6896,
    combos: [
      { nome: 'Lavagem express', preco: 45, itens: ['Lavagem externa', 'Secagem', 'Pretinho nos pneus'] },
      {
        nome: 'Lavagem completa',
        preco: 80,
        itens: ['Lavagem externa', 'Lavagem de rodas', 'Aspiração', 'Limpeza de painel', 'Limpeza de vidros', 'Secagem', 'Pretinho nos pneus'],
      },
      {
        nome: 'Completa + cera',
        preco: 110,
        itens: ['Lavagem externa', 'Lavagem de rodas', 'Aspiração', 'Limpeza de vidros', 'Secagem', 'Enceramento', 'Pretinho nos pneus'],
      },
      {
        nome: 'Higienização interna',
        preco: 220,
        itens: ['Aspiração', 'Higienização de bancos', 'Higienização de teto e carpete', 'Limpeza de painel', 'Oxi-sanitização'],
      },
      { nome: 'Polimento técnico', preco: 350, itens: ['Lavagem externa', 'Descontaminação de pintura', 'Secagem', 'Polimento'] },
    ],
    pedidos: [
      { modelo: 'Jeep Compass', placa: 'FTR4B21', servico: 'Completa + cera', horario: '2026-10-03T08:30:00-03:00', status: 'concluido', fotos: 2 },
      { modelo: 'Fiat Argo', placa: 'QWE2C45', servico: 'Lavagem express', horario: '2026-10-03T09:15:00-03:00', status: 'concluido', fotos: 1 },
      { modelo: 'Toyota Corolla', placa: 'BRA2E19', servico: 'Lavagem completa', horario: '2026-10-03T10:00:00-03:00', status: 'em_andamento', fotos: 2 },
      { modelo: 'Honda HR-V', placa: 'GHI7J88', servico: 'Higienização interna', horario: '2026-10-03T10:30:00-03:00', status: 'em_andamento', fotos: 3 },
      { modelo: 'VW T-Cross', placa: 'RTY5K32', servico: 'Lavagem completa', horario: '2026-10-03T13:00:00-03:00', status: 'pendente', fotos: 2 },
      { modelo: 'Hyundai HB20', placa: 'MNO3P71', servico: 'Lavagem express', horario: '2026-10-03T14:30:00-03:00', status: 'pendente', fotos: 1 },
      { modelo: 'Chevrolet Tracker', placa: 'UVW8X14', servico: 'Polimento técnico', horario: '2026-10-03T15:00:00-03:00', status: 'pendente', fotos: 3 },
      { modelo: 'Renault Kwid', placa: 'KLM1N66', servico: 'Lavagem express', horario: '2026-10-04T09:00:00-03:00', status: 'pendente', fotos: 1 },
      { modelo: 'Jeep Compass', placa: 'FTR4B21', servico: 'Lavagem completa', horario: '2026-09-26T11:00:00-03:00', status: 'concluido', fotos: 2 },
      { modelo: 'Nissan Kicks', placa: 'PQR6S09', servico: 'Completa + cera', horario: '2026-10-02T16:00:00-03:00', status: 'concluido', fotos: 2 },
    ],
    intercorrencias: [...FERIADOS, { data: '2026-10-08', motivo: 'Manutenção da lavadora de alta pressão', horaInicio: '14:00', horaFim: '17:00' }],
  },
  {
    name: 'Espaço Auto Spa Moema',
    cnpj: '38455102000171',
    address: 'Av. Ibirapuera, 2120 - Moema, São Paulo - SP, CEP 04028002',
    rating: 4.7,
    reviewsCount: 158,
    distance: '4.8 km',
    time: '18 min',
    latitude: -23.6015,
    longitude: -46.665,
    combos: [
      { nome: 'Lavagem tradicional', preco: 60, itens: ['Lavagem externa', 'Aspiração', 'Limpeza de vidros', 'Secagem'] },
      {
        nome: 'Spa completo',
        preco: 180,
        itens: ['Lavagem externa', 'Lavagem de rodas', 'Aspiração', 'Limpeza de painel', 'Limpeza de vidros', 'Secagem', 'Enceramento', 'Hidratação de couro'],
      },
      { nome: 'Cristalização de pintura', preco: 450, itens: ['Lavagem externa', 'Descontaminação de pintura', 'Secagem', 'Polimento', 'Cristalização'] },
      { nome: 'Vitrificação premium', preco: 1200, itens: ['Lavagem externa', 'Descontaminação de pintura', 'Secagem', 'Polimento', 'Vitrificação'] },
      { nome: 'Lavagem de motor', preco: 90, ativo: false, itens: ['Lavagem do motor', 'Secagem'] },
    ],
    pedidos: [
      { modelo: 'BMW 320i', placa: 'BMW3A20', servico: 'Spa completo', horario: '2026-10-03T09:00:00-03:00', status: 'em_andamento', fotos: 3 },
      { modelo: 'Audi Q3', placa: 'AUD1Q33', servico: 'Cristalização de pintura', horario: '2026-10-03T11:00:00-03:00', status: 'pendente', fotos: 2 },
      { modelo: 'Toyota SW4', placa: 'SWF4T44', servico: 'Lavagem tradicional', horario: '2026-10-02T15:30:00-03:00', status: 'concluido', fotos: 2 },
    ],
    intercorrencias: [...FERIADOS],
  },
  {
    name: 'Brilho Express Pinheiros',
    cnpj: '27904316000148',
    address: 'Rua dos Pinheiros, 870 - Pinheiros, São Paulo - SP, CEP 05422001',
    rating: 4.6,
    reviewsCount: 97,
    distance: '2.0 km',
    time: '9 min',
    latitude: -23.5664,
    longitude: -46.6862,
    combos: [
      { nome: 'Ducha rápida', preco: 30, itens: ['Lavagem externa', 'Secagem'] },
      { nome: 'Lavagem com aspiração', preco: 55, itens: ['Lavagem externa', 'Aspiração', 'Secagem', 'Pretinho nos pneus'] },
      { nome: 'Lavagem por baixo', preco: 70, itens: ['Lavagem externa', 'Lavagem de chassi', 'Lavagem de rodas', 'Secagem'] },
    ],
    pedidos: [
      { modelo: 'VW Polo', placa: 'POL0V12', servico: 'Ducha rápida', horario: '2026-10-03T12:00:00-03:00', status: 'pendente', fotos: 1 },
      { modelo: 'Fiat Toro', placa: 'TOR0F55', servico: 'Lavagem por baixo', horario: '2026-10-03T08:00:00-03:00', status: 'concluido', fotos: 2 },
    ],
    intercorrencias: [...FERIADOS],
  },
  {
    name: 'Eco Wash Tatuapé',
    cnpj: '51287630000192',
    address: 'Rua Tuiuti, 1500 - Tatuapé, São Paulo - SP, CEP 03081000',
    rating: 4.5,
    reviewsCount: 73,
    distance: '9.6 km',
    time: '25 min',
    latitude: -23.5408,
    longitude: -46.5768,
    combos: [
      { nome: 'Lavagem ecológica', preco: 50, itens: ['Lavagem externa', 'Limpeza de vidros', 'Secagem'] },
      { nome: 'Eco completa', preco: 95, itens: ['Lavagem externa', 'Lavagem de rodas', 'Aspiração', 'Limpeza de painel', 'Secagem', 'Enceramento'] },
      { nome: 'Sanitização de cabine', preco: 120, itens: ['Aspiração', 'Limpeza de painel', 'Oxi-sanitização'] },
    ],
    pedidos: [
      { modelo: 'Chevrolet Onix', placa: 'ONX2C77', servico: 'Eco completa', horario: '2026-10-02T10:00:00-03:00', status: 'concluido', fotos: 2 },
    ],
    // Fechada hoje (dia inteiro) — mostra o estado "FECHADO" no app.
    intercorrencias: [...FERIADOS, { data: '2026-10-03', motivo: 'Manutenção do sistema de reúso de água' }],
  },
  {
    name: 'Garagem Detail Santana',
    cnpj: '63018245000137',
    address: 'Rua Voluntários da Pátria, 2400 - Santana, São Paulo - SP, CEP 02402000',
    rating: 4.8,
    reviewsCount: 186,
    distance: '7.3 km',
    time: '21 min',
    latitude: -23.502,
    longitude: -46.625,
    combos: [
      { nome: 'Lavagem detalhada', preco: 90, itens: ['Lavagem externa', 'Lavagem de rodas', 'Aspiração', 'Limpeza de painel', 'Limpeza de vidros', 'Secagem', 'Pretinho nos pneus'] },
      { nome: 'Couro renovado', preco: 160, itens: ['Aspiração', 'Higienização de bancos', 'Hidratação de couro'] },
      { nome: 'Detail completo', preco: 650, itens: ['Lavagem externa', 'Lavagem do motor', 'Descontaminação de pintura', 'Secagem', 'Polimento', 'Cristalização', 'Hidratação de couro'] },
    ],
    pedidos: [
      { modelo: 'Mitsubishi L200', placa: 'LDU2M00', servico: 'Lavagem detalhada', horario: '2026-10-03T10:00:00-03:00', status: 'em_andamento', fotos: 2 },
      { modelo: 'Ford Ranger', placa: 'RNG3F21', servico: 'Couro renovado', horario: '2026-10-04T10:00:00-03:00', status: 'pendente', fotos: 2 },
    ],
    intercorrencias: [...FERIADOS],
  },
  {
    name: 'Lava-Rápido Augusta',
    cnpj: '19736584000105',
    address: 'Rua Augusta, 1600 - Consolação, São Paulo - SP, CEP 01304001',
    rating: 4.3,
    reviewsCount: 54,
    distance: '3.2 km',
    time: '14 min',
    latitude: -23.5582,
    longitude: -46.6588,
    combos: [
      { nome: 'Lavagem simples', preco: 35, itens: ['Lavagem externa', 'Secagem'] },
      { nome: 'Lavagem + aspiração', preco: 50, itens: ['Lavagem externa', 'Aspiração', 'Secagem'] },
    ],
    pedidos: [
      { modelo: 'Renault Sandero', placa: 'SND1R40', servico: 'Lavagem + aspiração', horario: '2026-10-03T16:00:00-03:00', status: 'pendente', fotos: 1 },
    ],
    intercorrencias: [...FERIADOS],
  },
]

// Solicitação de onboarding parada em "aguardando contrato", para demonstrar o
// fluxo: no admin-front, "Cadastrar" com este CNPJ retoma a solicitação.
const SOLICITACAO_PENDENTE = {
  name: 'Lava Car Butantã',
  cnpj: '72645819000163',
  address: 'Av. Vital Brasil, 1100 - Butantã, São Paulo - SP, CEP 05503001',
}

function fotos(placa: string, quantidade = 0) {
  return Array.from({ length: quantidade }, (_, i) => `https://placehold.co/400x300?text=${placa}+foto+${i + 1}`)
}

async function main() {
  const itens = await prisma.itemServico.findMany({ select: { id: true, nome: true } })
  const itemIdPorNome = new Map(itens.map((item) => [item.nome, item.id]))
  if (itemIdPorNome.size === 0) throw new Error('Catálogo de itens vazio — rode o seed (npm run prisma:seed) antes.')

  let criadas = 0
  for (const empresa of empresas) {
    if (await prisma.lavaRapido.findUnique({ where: { cnpj: empresa.cnpj } })) {
      console.log(`- ${empresa.name}: já existe, pulando`)
      continue
    }

    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: empresa.name,
        cnpj: empresa.cnpj,
        senha: SENHA_PADRAO_HASH,
        address: empresa.address,
        rating: empresa.rating,
        reviewsCount: empresa.reviewsCount,
        distance: empresa.distance,
        time: empresa.time,
        price: 0, // exibido é calculado pelos serviços (GET /lavaRapidos)
        isOpen: true,
        image: `https://placehold.co/300x300?text=${encodeURIComponent(empresa.name)}`,
        latitude: empresa.latitude,
        longitude: empresa.longitude,
      },
    })

    for (const combo of empresa.combos) {
      const itemIds = combo.itens.map((nome) => {
        const id = itemIdPorNome.get(nome)
        if (!id) throw new Error(`Item "${nome}" não existe no catálogo`)
        return id
      })
      await prisma.servico.create({
        data: {
          lavaRapidoId: lavaRapido.id,
          nome: combo.nome,
          preco: combo.preco,
          ativo: combo.ativo ?? true,
          itens: { create: itemIds.map((itemId) => ({ itemId })) },
        },
      })
    }

    await prisma.pedido.createMany({
      data: empresa.pedidos.map((pedido) => ({
        lavaRapidoId: lavaRapido.id,
        veiculo: { modelo: pedido.modelo, placa: pedido.placa },
        servico: pedido.servico,
        horario: new Date(pedido.horario),
        status: pedido.status,
        fotos: fotos(pedido.placa, pedido.fotos),
      })),
    })

    await prisma.intercorrencia.createMany({
      data: empresa.intercorrencias.map((intercorrencia) => ({
        lavaRapidoId: lavaRapido.id,
        data: intercorrencia.data,
        motivo: intercorrencia.motivo,
        diaInteiro: !intercorrencia.horaInicio,
        horaInicio: intercorrencia.horaInicio ?? null,
        horaFim: intercorrencia.horaFim ?? null,
      })),
    })

    criadas += 1
    console.log(`+ ${empresa.name} (CNPJ ${empresa.cnpj}): ${empresa.combos.length} serviços, ${empresa.pedidos.length} pedidos`)
  }

  const contrato = await prisma.contrato.findFirst({ where: { vigente: true } })
  const solicitacaoExiste = await prisma.solicitacaoOnboarding.findFirst({ where: { cnpj: SOLICITACAO_PENDENTE.cnpj } })
  if (contrato && !solicitacaoExiste) {
    await prisma.solicitacaoOnboarding.create({ data: { ...SOLICITACAO_PENDENTE, contratoId: contrato.id } })
    console.log(`+ Solicitação pendente: ${SOLICITACAO_PENDENTE.name} (CNPJ ${SOLICITACAO_PENDENTE.cnpj})`)
  }

  console.log(`Demo concluída: ${criadas} empresas novas. Senha de todas: "${SENHA_PADRAO}".`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
