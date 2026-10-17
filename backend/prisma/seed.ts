import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { garantirInternoDemo, INTERNO_DEMO } from './internoExemplo.js'
import { criarHorariosSeNaoTiver, HORARIO_PADRAO, HORARIO_TODOS_OS_DIAS } from './horariosExemplo.js'
import { criarPedidoExemplo, garantirClienteExemplo, type ClienteExemplo } from './pedidosExemplo.js'

const prisma = new PrismaClient()

// SENHA SÓ PARA DESENVOLVIMENTO (I17): todas as empresas do seed entram com
// a senha "demo1234" e um e-mail de exemplo (empresa101@exemplo.com …).
// Hasheada do mesmo jeito que o onboarding faz.
const SENHA_DEMO_LAVA_RAPIDO = 'demo1234'
const SENHA_PADRAO_HASH = bcrypt.hashSync(SENHA_DEMO_LAVA_RAPIDO, 10)

// Contrato mock do onboarding (docs/plan/onboarding-contrato-empresa) — termos
// fictícios; o aceite é o texto "eu aceito" digitado pelo dono no admin-front.
const CONTRATO_MOCK = {
  versao: 1,
  titulo: 'Termos de parceria WashAway',
  conteudo: [
    '1. A empresa parceira declara que as informações enviadas no cadastro são verdadeiras.',
    '2. A WashAway exibirá a empresa no aplicativo para consumidores, junto com seus serviços, preços e disponibilidade.',
    '3. A empresa se compromete a manter serviços, preços e disponibilidade atualizados no painel.',
    '4. Os pedidos recebidos pelo aplicativo devem ser atendidos conforme o horário combinado com o consumidor.',
    '5. Este é um contrato de demonstração, sem valor legal.',
    '',
    'Para assinar, digite "eu aceito" no campo abaixo.',
  ].join('\n'),
  vigente: true,
}

const lavaRapidosData = [
  {
    name: 'Aqua Shine Lava-Rápido',
    cnpj: '00000000000101',
    email: 'empresa101@exemplo.com',
    senha: SENHA_PADRAO_HASH,
    address: 'Rua Canhemborá, 120 - Vila Gustavo, São Paulo - SP, CEP 02253010',
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
    email: 'empresa102@exemplo.com',
    senha: SENHA_PADRAO_HASH,
    address: 'Rua Canhemborá, 245 - Vila Gustavo, São Paulo - SP, CEP 02253010',
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
    email: 'empresa103@exemplo.com',
    senha: SENHA_PADRAO_HASH,
    address: 'Rua Canhemborá, 88 - Vila Gustavo, São Paulo - SP, CEP 02253010',
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
    email: 'empresa104@exemplo.com',
    senha: SENHA_PADRAO_HASH,
    address: 'Rua Canhemborá, 310 - Vila Gustavo, São Paulo - SP, CEP 02253010',
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
    email: 'empresa105@exemplo.com',
    senha: SENHA_PADRAO_HASH,
    address: 'Rua Canhemborá, 57 - Vila Gustavo, São Paulo - SP, CEP 02253010',
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

// Catálogo global de itens — a loja só monta combos com eles (não cria itens).
const itensCatalogoData = [
  { nome: 'Lavagem externa', descricao: 'Lavagem da carroceria', categoria: 'Lavagem', duracaoMinutos: 20 },
  { nome: 'Lavagem de rodas', descricao: 'Rodas e caixas de roda', categoria: 'Lavagem', duracaoMinutos: 15 },
  { nome: 'Lavagem do motor', descricao: 'Limpeza do compartimento do motor', categoria: 'Lavagem', duracaoMinutos: 30 },
  { nome: 'Lavagem de chassi', descricao: 'Lavagem por baixo do veículo', categoria: 'Lavagem', duracaoMinutos: 20 },
  { nome: 'Aspiração', descricao: 'Aspiração de bancos, tapetes e porta-malas', categoria: 'Limpeza interna', duracaoMinutos: 15 },
  { nome: 'Limpeza de painel', descricao: 'Painel e plásticos internos', categoria: 'Limpeza interna', duracaoMinutos: 15 },
  { nome: 'Limpeza de vidros', descricao: 'Vidros por dentro e por fora', categoria: 'Limpeza interna', duracaoMinutos: 10 },
  { nome: 'Higienização de bancos', descricao: 'Limpeza profunda dos estofados', categoria: 'Limpeza interna', duracaoMinutos: 60 },
  { nome: 'Higienização de teto e carpete', descricao: 'Limpeza profunda de teto e carpete', categoria: 'Limpeza interna', duracaoMinutos: 60 },
  { nome: 'Oxi-sanitização', descricao: 'Eliminação de odores e germes do ar-condicionado e cabine', categoria: 'Limpeza interna', duracaoMinutos: 30 },
  { nome: 'Secagem', descricao: 'Secagem manual da carroceria', categoria: 'Secagem e acabamento', duracaoMinutos: 10 },
  { nome: 'Pretinho nos pneus', descricao: 'Revitalização dos pneus', categoria: 'Secagem e acabamento', duracaoMinutos: 5 },
  { nome: 'Hidratação de couro', descricao: 'Hidratação de bancos de couro', categoria: 'Secagem e acabamento', duracaoMinutos: 40 },
  { nome: 'Enceramento', descricao: 'Aplicação de cera protetora', categoria: 'Estética e proteção', duracaoMinutos: 30 },
  { nome: 'Polimento', descricao: 'Remoção de riscos leves e brilho da pintura', categoria: 'Estética e proteção', duracaoMinutos: 120 },
  { nome: 'Cristalização', descricao: 'Proteção da pintura com efeito espelhado', categoria: 'Estética e proteção', duracaoMinutos: 90 },
  { nome: 'Vitrificação', descricao: 'Revestimento cerâmico de longa duração', categoria: 'Estética e proteção', duracaoMinutos: 180 },
  { nome: 'Descontaminação de pintura', descricao: 'Remoção de contaminantes com clay bar', categoria: 'Estética e proteção', duracaoMinutos: 45 },
]

const combosData = [
  { nome: 'Lavagem simples', preco: 40, ativo: true, itens: ['Lavagem externa', 'Secagem'] },
  {
    nome: 'Lavagem completa',
    preco: 70,
    ativo: true,
    itens: ['Lavagem externa', 'Lavagem de rodas', 'Aspiração', 'Limpeza de vidros', 'Secagem', 'Pretinho nos pneus'],
  },
  { nome: 'Polimento', preco: 120, ativo: false, itens: ['Lavagem externa', 'Secagem', 'Polimento'] },
]

// Clientes do app de exemplo (I13) — SENHA SÓ PARA DESENVOLVIMENTO: "123456".
// Reaproveitados pelo e-mail (o seed não apaga clientes, só os pedidos).
const SENHA_DEMO_CLIENTE = '123456'
const clientesData: ClienteExemplo[] = [
  {
    nome: 'Ana Ribeiro',
    email: 'ana@exemplo.com',
    veiculos: [{ marca: 'Fiat', modelo: 'Argo', cor: 'Branco', placa: 'ABC1D23' }],
  },
  {
    nome: 'Bruno Carvalho',
    email: 'bruno@exemplo.com',
    veiculos: [
      { marca: 'Volkswagen', modelo: 'Gol', cor: 'Prata', placa: 'XYZ9E88' },
      { marca: 'Chevrolet', modelo: 'Onix', cor: 'Vermelho', placa: 'JKL4F56' },
    ],
  },
]

async function main() {
  // Onboarding: solicitações referenciam Contrato, então saem antes dele.
  await prisma.solicitacaoOnboarding.deleteMany()
  await prisma.contrato.deleteMany()
  await prisma.contrato.create({ data: CONTRATO_MOCK })

  // Pedidos antes dos serviços/clientes (PedidoServico sai junto, cascade).
  await prisma.pedido.deleteMany()
  await prisma.intercorrencia.deleteMany()
  await prisma.servico.deleteMany()
  await prisma.itemServico.deleteMany()
  await prisma.lavaRapido.deleteMany()

  const lavaRapidos = []
  for (const data of lavaRapidosData) {
    lavaRapidos.push(await prisma.lavaRapido.create({ data }))
  }

  const itemIdPorNome = new Map<string, string>()
  for (const data of itensCatalogoData) {
    const item = await prisma.itemServico.create({ data })
    itemIdPorNome.set(item.nome, item.id)
  }

  // Dados de servicos/intercorrencias hoje só em admin-front/mock-server/db.json,
  // replicados aqui por lava-rápido pra sair do json-server isolado.
  let servicosCount = 0
  let intercorrenciasCount = 0
  for (const lavaRapido of lavaRapidos) {
    for (const combo of combosData) {
      await prisma.servico.create({
        data: {
          lavaRapidoId: lavaRapido.id,
          nome: combo.nome,
          preco: combo.preco,
          ativo: combo.ativo,
          itens: { create: combo.itens.map((nomeItem) => ({ itemId: itemIdPorNome.get(nomeItem)! })) },
        },
      })
    }
    servicosCount += combosData.length

    await prisma.intercorrencia.createMany({
      data: [
        { lavaRapidoId: lavaRapido.id, data: '2026-10-12', motivo: 'Feriado', diaInteiro: true },
        {
          lavaRapidoId: lavaRapido.id,
          data: '2026-09-25',
          motivo: 'Falta de energia',
          diaInteiro: false,
          horaInicio: '14:00',
          horaFim: '16:00',
        },
      ],
    })
    intercorrenciasCount += 2

    // Horário de funcionamento (I19): padrão, e o último aberto todos os dias.
    // (Os horários antigos saem junto com o lavaRapido.deleteMany — cascade.)
    const ultimo = lavaRapido === lavaRapidos[lavaRapidos.length - 1]
    await criarHorariosSeNaoTiver(prisma, lavaRapido.id, ultimo ? HORARIO_TODOS_OS_DIAS : HORARIO_PADRAO)
  }

  // Pedidos no formato do I13: cliente + veículo do cadastro e serviços
  // congelados (nome/preço/duração), total e duração somados.
  const senhaClienteHash = bcrypt.hashSync(SENHA_DEMO_CLIENTE, 10)
  const [ana, bruno] = await Promise.all(
    clientesData.map((cliente) => garantirClienteExemplo(prisma, cliente, senhaClienteHash)),
  )
  const pedidosData = [
    {
      lavaRapidoId: lavaRapidos[0].id,
      clienteId: ana.clienteId,
      veiculoId: ana.veiculoIdPorPlaca.get('ABC1D23')!,
      servicos: ['Lavagem completa'],
      horario: new Date('2026-09-16T09:00:00.000Z'),
      status: 'pendente' as const,
      fotos: [
        'https://placehold.co/400x300?text=Antes+1',
        'https://placehold.co/400x300?text=Antes+2',
      ],
    },
    {
      lavaRapidoId: lavaRapidos[1].id,
      clienteId: bruno.clienteId,
      veiculoId: bruno.veiculoIdPorPlaca.get('XYZ9E88')!,
      servicos: ['Lavagem simples'],
      horario: new Date('2026-09-16T10:30:00.000Z'),
      status: 'em_andamento' as const,
      fotos: ['https://placehold.co/400x300?text=Antes+1'],
    },
    {
      lavaRapidoId: lavaRapidos[2].id,
      clienteId: bruno.clienteId,
      veiculoId: bruno.veiculoIdPorPlaca.get('JKL4F56')!,
      // Serviço inativo também pode estar num pedido antigo (era ativo na compra).
      servicos: ['Lavagem completa', 'Polimento'],
      horario: new Date('2026-09-15T15:00:00.000Z'),
      status: 'concluido' as const,
      fotos: [
        'https://placehold.co/400x300?text=Antes+1',
        'https://placehold.co/400x300?text=Depois+1',
      ],
    },
  ]
  for (const pedido of pedidosData) {
    await criarPedidoExemplo(prisma, pedido)
  }

  // Usuário interno de exemplo (i17-interno-exclusao), só para dev: opera as
  // rotas internas pelo Swagger (/api-docs). Só cria se não existir.
  if (await garantirInternoDemo(prisma)) {
    console.log(`+ Usuário interno: ${INTERNO_DEMO.email} / senha "${INTERNO_DEMO.senha}" (permissão admin)`)
  }

  console.log(
    `Seed concluído: ${lavaRapidos.length} lava-rápidos, ${pedidosData.length} pedidos, ${servicosCount} serviços, ${intercorrenciasCount} intercorrências, ` +
      `${clientesData.length} clientes (senha "${SENHA_DEMO_CLIENTE}").`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
