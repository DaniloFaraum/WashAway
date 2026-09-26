import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { SENHA_PADRAO } from '../src/modules/lava-rapidos/lavaRapidos.service.js'

const prisma = new PrismaClient()

// Hasheada aqui do mesmo jeito que o cadastro real (POST /lava-rapidos) faz.
const SENHA_PADRAO_HASH = bcrypt.hashSync(SENHA_PADRAO, 10)

const lavaRapidosData = [
  {
    name: 'Aqua Shine Lava-Rápido',
    cnpj: '00000000000101',
    senha: SENHA_PADRAO_HASH,
    rating: 4.8,
    reviewsCount: 124,
    distance: '1.2 km',
    time: '5 min',
    price: 45,
    isOpen: true,
    image: 'https://placehold.co/300x300?text=Aqua+Shine',
    latitude: -23.5505,
    longitude: -46.6333,
  },
  {
    name: 'Lava Rápido Centro',
    cnpj: '00000000000102',
    senha: SENHA_PADRAO_HASH,
    rating: 4.5,
    reviewsCount: 89,
    distance: '2.4 km',
    time: '8 min',
    price: 39,
    isOpen: true,
    image: 'https://placehold.co/300x300?text=Centro',
    latitude: -23.5506,
    longitude: -46.6341,
  },
  {
    name: 'Super Wash Express',
    cnpj: '00000000000103',
    senha: SENHA_PADRAO_HASH,
    rating: 4.2,
    reviewsCount: 56,
    distance: '3.1 km',
    time: '12 min',
    price: 55,
    isOpen: false,
    image: 'https://placehold.co/300x300?text=Super+Wash',
    latitude: -23.5498,
    longitude: -46.6324,
  },
  {
    name: 'Brilho Total Premium',
    cnpj: '00000000000104',
    senha: SENHA_PADRAO_HASH,
    rating: 5.0,
    reviewsCount: 208,
    distance: '0.7 km',
    time: '3 min',
    price: 69,
    isOpen: true,
    image: 'https://placehold.co/300x300?text=Brilho+Total',
    latitude: -23.5513,
    longitude: -46.6329,
  },
  {
    name: 'Crystal Jet Wash',
    cnpj: '00000000000105',
    senha: SENHA_PADRAO_HASH,
    rating: 4.6,
    reviewsCount: 141,
    distance: '4.8 km',
    time: '16 min',
    price: 42,
    isOpen: false,
    image: 'https://placehold.co/300x300?text=Crystal+Jet',
    latitude: -23.5492,
    longitude: -46.6348,
  },
]

async function main() {
  await prisma.pedido.deleteMany()
  await prisma.lavaRapido.deleteMany()

  const lavaRapidos = []
  for (const data of lavaRapidosData) {
    lavaRapidos.push(await prisma.lavaRapido.create({ data }))
  }

  const pedidosData = [
    {
      lavaRapidoId: lavaRapidos[0].id,
      veiculo: { modelo: 'Fiat Argo', placa: 'ABC1D23' },
      servico: 'Lavagem completa',
      horario: new Date('2026-09-16T09:00:00.000Z'),
      status: 'pendente' as const,
      fotos: [
        'https://placehold.co/400x300?text=Antes+1',
        'https://placehold.co/400x300?text=Antes+2',
      ],
    },
    {
      lavaRapidoId: lavaRapidos[1].id,
      veiculo: { modelo: 'VW Gol', placa: 'XYZ9E88' },
      servico: 'Lavagem simples',
      horario: new Date('2026-09-16T10:30:00.000Z'),
      status: 'em_andamento' as const,
      fotos: ['https://placehold.co/400x300?text=Antes+1'],
    },
    {
      lavaRapidoId: lavaRapidos[2].id,
      veiculo: { modelo: 'Chevrolet Onix', placa: 'JKL4F56' },
      servico: 'Lavagem completa + polimento',
      horario: new Date('2026-09-15T15:00:00.000Z'),
      status: 'concluido' as const,
      fotos: [
        'https://placehold.co/400x300?text=Antes+1',
        'https://placehold.co/400x300?text=Depois+1',
      ],
    },
  ]

  for (const data of pedidosData) {
    await prisma.pedido.create({ data })
  }

  console.log(`Seed concluído: ${lavaRapidos.length} lava-rápidos, ${pedidosData.length} pedidos.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
