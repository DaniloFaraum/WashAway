import 'dotenv/config'
import { PrismaClient, type PedidoStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { criarHorariosSeNaoTiver, HORARIO_ESTENDIDO, HORARIO_PADRAO, HORARIO_TODOS_OS_DIAS, type DiaExemplo } from './horariosExemplo.js'
import { criarPedidoExemplo, garantirClienteExemplo, type ClienteExemplo } from './pedidosExemplo.js'

// Dados de demonstração para apresentação. Diferente do seed.ts, este script
// NUNCA apaga nada: só insere, e pula toda empresa cujo CNPJ já existe — pode
// rodar quantas vezes quiser sem perder dados cadastrados pela UI.
// Pré-requisito: catálogo de itens e contrato vigente já no banco (seed.ts).
//
// SENHAS SÓ PARA DESENVOLVIMENTO/DEMO (I17): empresas criadas por este script
// entram com CNPJ (ou e-mail gerado do nome) e a senha "demo1234". Empresas que
// já existiam no banco antes do I17 continuam com a senha antiga ("admin") até o
// script de troca em massa do i17-senha-gerada.

const prisma = new PrismaClient()
const SENHA_DEMO_LAVA_RAPIDO = 'demo1234'
const SENHA_DEMO_HASH = bcrypt.hashSync(SENHA_DEMO_LAVA_RAPIDO, 10)

/** E-mail de exemplo a partir do nome (ex.: "lava-jato-vila-madalena@exemplo.com"). */
function emailDemo(nome: string) {
  const slug = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug}@exemplo.com`
}

type Combo = { nome: string; preco: number; ativo?: boolean; itens: string[] }
// Pedido (I13): o cliente/veículo vem da placa (CLIENTES_DEMO); `servicos` são
// nomes de combos da própria empresa, congelados no pedido.
type PedidoDemo = { placa: string; servicos: string[]; horario: string; status: PedidoStatus; fotos?: number }
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
  /** Horário de funcionamento (I19); padrão: HORARIO_PADRAO. */
  horarios?: DiaExemplo[]
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
      { placa: 'FTR4B21', servicos: ['Completa + cera'], horario: '2026-10-03T08:30:00-03:00', status: 'concluido', fotos: 2 },
      { placa: 'QWE2C45', servicos: ['Lavagem express'], horario: '2026-10-03T09:15:00-03:00', status: 'concluido', fotos: 1 },
      { placa: 'BRA2E19', servicos: ['Lavagem completa'], horario: '2026-10-03T10:00:00-03:00', status: 'em_andamento', fotos: 2 },
      { placa: 'GHI7J88', servicos: ['Higienização interna'], horario: '2026-10-03T10:30:00-03:00', status: 'em_andamento', fotos: 3 },
      { placa: 'RTY5K32', servicos: ['Lavagem completa', 'Higienização interna'], horario: '2026-10-03T13:00:00-03:00', status: 'pendente', fotos: 2 },
      { placa: 'MNO3P71', servicos: ['Lavagem express'], horario: '2026-10-03T14:30:00-03:00', status: 'pendente', fotos: 1 },
      { placa: 'UVW8X14', servicos: ['Polimento técnico'], horario: '2026-10-03T15:00:00-03:00', status: 'pendente', fotos: 3 },
      { placa: 'KLM1N66', servicos: ['Lavagem express', 'Completa + cera'], horario: '2026-10-04T09:00:00-03:00', status: 'pendente', fotos: 1 },
      { placa: 'FTR4B21', servicos: ['Lavagem completa'], horario: '2026-09-26T11:00:00-03:00', status: 'concluido', fotos: 2 },
      { placa: 'PQR6S09', servicos: ['Completa + cera'], horario: '2026-10-02T16:00:00-03:00', status: 'concluido', fotos: 2 },
    ],
    intercorrencias: [...FERIADOS, { data: '2026-10-08', motivo: 'Manutenção da lavadora de alta pressão', horaInicio: '14:00', horaFim: '17:00' }],
    horarios: HORARIO_ESTENDIDO,
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
      { placa: 'BMW3A20', servicos: ['Spa completo'], horario: '2026-10-03T09:00:00-03:00', status: 'em_andamento', fotos: 3 },
      { placa: 'AUD1Q33', servicos: ['Lavagem tradicional', 'Cristalização de pintura'], horario: '2026-10-03T11:00:00-03:00', status: 'pendente', fotos: 2 },
      { placa: 'SWF4T44', servicos: ['Lavagem tradicional'], horario: '2026-10-02T15:30:00-03:00', status: 'concluido', fotos: 2 },
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
      { placa: 'POL0V12', servicos: ['Ducha rápida'], horario: '2026-10-03T12:00:00-03:00', status: 'pendente', fotos: 1 },
      { placa: 'TOR0F55', servicos: ['Lavagem por baixo'], horario: '2026-10-03T08:00:00-03:00', status: 'concluido', fotos: 2 },
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
      { placa: 'ONX2C77', servicos: ['Eco completa'], horario: '2026-10-02T10:00:00-03:00', status: 'concluido', fotos: 2 },
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
      { placa: 'LDU2M00', servicos: ['Lavagem detalhada'], horario: '2026-10-03T10:00:00-03:00', status: 'em_andamento', fotos: 2 },
      { placa: 'RNG3F21', servicos: ['Couro renovado'], horario: '2026-10-04T10:00:00-03:00', status: 'pendente', fotos: 2 },
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
      { placa: 'SND1R40', servicos: ['Lavagem + aspiração'], horario: '2026-10-03T16:00:00-03:00', status: 'pendente', fotos: 1 },
    ],
    intercorrencias: [...FERIADOS],
    // Aberto também aos domingos.
    horarios: HORARIO_TODOS_OS_DIAS,
  },
]

// Solicitação de onboarding parada em "aguardando contrato", para demonstrar o
// fluxo: no admin-front, "Cadastrar" com este CNPJ retoma a solicitação.
const SOLICITACAO_PENDENTE = {
  name: 'Lava Car Butantã',
  cnpj: '72645819000163',
  address: 'Av. Vital Brasil, 1100 - Butantã, São Paulo - SP, CEP 05503001',
}

// Clientes de exemplo do app (I2/I3/I13) — senha conhecida SÓ para
// desenvolvimento/demo: "123456" para todos. Cada placa dos pedidos acima é de
// um destes veículos (placa já normalizada, sem hífen, maiúsculas). Criados ou
// reaproveitados por e-mail/placa — nada é apagado.
const SENHA_DEMO_CLIENTE = '123456'
const CLIENTES_DEMO: ClienteExemplo[] = [
  {
    nome: 'Mariana Souza',
    email: 'mariana@exemplo.com',
    veiculos: [
      { marca: 'Chevrolet', modelo: 'Onix', cor: 'Prata', placa: 'RIO2A18' },
      { marca: 'Honda', modelo: 'Fit', cor: 'Preto', placa: 'FGH4521' },
      { marca: 'Jeep', modelo: 'Compass', cor: 'Cinza', placa: 'FTR4B21' },
    ],
  },
  {
    nome: 'Carlos Andrade',
    email: 'carlos@exemplo.com',
    veiculos: [
      { marca: 'Fiat', modelo: 'Argo', cor: 'Branco', placa: 'QWE2C45' },
      { marca: 'Toyota', modelo: 'Corolla', cor: 'Preto', placa: 'BRA2E19' },
    ],
  },
  {
    nome: 'Juliana Prado',
    email: 'juliana@exemplo.com',
    veiculos: [
      { marca: 'Honda', modelo: 'HR-V', cor: 'Azul', placa: 'GHI7J88' },
      { marca: 'Volkswagen', modelo: 'T-Cross', cor: 'Branco', placa: 'RTY5K32' },
    ],
  },
  {
    nome: 'Rafael Moreira',
    email: 'rafael@exemplo.com',
    veiculos: [
      { marca: 'Hyundai', modelo: 'HB20', cor: 'Prata', placa: 'MNO3P71' },
      { marca: 'Chevrolet', modelo: 'Tracker', cor: 'Vermelho', placa: 'UVW8X14' },
      { marca: 'Renault', modelo: 'Kwid', cor: 'Laranja', placa: 'KLM1N66' },
    ],
  },
  {
    nome: 'Beatriz Santos',
    email: 'beatriz@exemplo.com',
    veiculos: [
      { marca: 'Nissan', modelo: 'Kicks', cor: 'Cinza', placa: 'PQR6S09' },
      { marca: 'BMW', modelo: '320i', cor: 'Preto', placa: 'BMW3A20' },
      { marca: 'Audi', modelo: 'Q3', cor: 'Branco', placa: 'AUD1Q33' },
    ],
  },
  {
    nome: 'Pedro Henrique Lima',
    email: 'pedro@exemplo.com',
    veiculos: [
      { marca: 'Toyota', modelo: 'SW4', cor: 'Prata', placa: 'SWF4T44' },
      { marca: 'Volkswagen', modelo: 'Polo', cor: 'Azul', placa: 'POL0V12' },
      { marca: 'Fiat', modelo: 'Toro', cor: 'Vermelho', placa: 'TOR0F55' },
    ],
  },
  {
    nome: 'Fernanda Costa',
    email: 'fernanda@exemplo.com',
    veiculos: [
      { marca: 'Chevrolet', modelo: 'Onix', cor: 'Branco', placa: 'ONX2C77' },
      { marca: 'Mitsubishi', modelo: 'L200', cor: 'Prata', placa: 'LDU2M00' },
      { marca: 'Ford', modelo: 'Ranger', cor: 'Preto', placa: 'RNG3F21' },
      { marca: 'Renault', modelo: 'Sandero', cor: 'Cinza', placa: 'SND1R40' },
    ],
  },
]

function fotos(placa: string, quantidade = 0) {
  return Array.from({ length: quantidade }, (_, i) => `https://placehold.co/400x300?text=${placa}+foto+${i + 1}`)
}

async function main() {
  const itens = await prisma.itemServico.findMany({ select: { id: true, nome: true } })
  const itemIdPorNome = new Map(itens.map((item) => [item.nome, item.id]))
  if (itemIdPorNome.size === 0) throw new Error('Catálogo de itens vazio — rode o seed (npm run prisma:seed) antes.')

  // Clientes e veículos do app primeiro: os pedidos das empresas apontam para eles (I13).
  const senhaClienteHash = bcrypt.hashSync(SENHA_DEMO_CLIENTE, 10)
  const donoDaPlaca = new Map<string, { clienteId: string; veiculoId: string }>()
  for (const cliente of CLIENTES_DEMO) {
    const { clienteId, clienteNovo, veiculosNovos, veiculoIdPorPlaca } = await garantirClienteExemplo(
      prisma,
      cliente,
      senhaClienteHash,
    )
    if (clienteNovo) console.log(`+ Cliente do app: ${cliente.email} / senha "${SENHA_DEMO_CLIENTE}"`)
    if (veiculosNovos > 0) console.log(`+ ${veiculosNovos} veículo(s) de ${cliente.email}`)
    for (const [placa, veiculoId] of veiculoIdPorPlaca) donoDaPlaca.set(placa, { clienteId, veiculoId })
  }

  let criadas = 0
  for (const empresa of empresas) {
    const existente = await prisma.lavaRapido.findUnique({ where: { cnpj: empresa.cnpj } })
    if (existente) {
      // Empresa já existe: só ganha horário de funcionamento se ainda não tiver nenhum.
      const ganhouHorario = await criarHorariosSeNaoTiver(prisma, existente.id, empresa.horarios ?? HORARIO_PADRAO)
      console.log(`- ${empresa.name}: já existe, pulando${ganhouHorario ? ' (horário de funcionamento adicionado)' : ''}`)
      continue
    }

    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: empresa.name,
        cnpj: empresa.cnpj,
        email: emailDemo(empresa.name),
        senha: SENHA_DEMO_HASH,
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

    for (const pedido of empresa.pedidos) {
      const dono = donoDaPlaca.get(pedido.placa)
      if (!dono) throw new Error(`Placa ${pedido.placa} não é de nenhum cliente de CLIENTES_DEMO`)
      await criarPedidoExemplo(prisma, {
        lavaRapidoId: lavaRapido.id,
        clienteId: dono.clienteId,
        veiculoId: dono.veiculoId,
        servicos: pedido.servicos,
        horario: new Date(pedido.horario),
        status: pedido.status,
        fotos: fotos(pedido.placa, pedido.fotos),
      })
    }

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

    await criarHorariosSeNaoTiver(prisma, lavaRapido.id, empresa.horarios ?? HORARIO_PADRAO)

    criadas += 1
    console.log(`+ ${empresa.name} (CNPJ ${empresa.cnpj}): ${empresa.combos.length} serviços, ${empresa.pedidos.length} pedidos`)
  }

  const contrato = await prisma.contrato.findFirst({ where: { vigente: true } })
  const solicitacaoExiste = await prisma.solicitacaoOnboarding.findFirst({ where: { cnpj: SOLICITACAO_PENDENTE.cnpj } })
  if (contrato && !solicitacaoExiste) {
    await prisma.solicitacaoOnboarding.create({
      data: {
        ...SOLICITACAO_PENDENTE,
        email: emailDemo(SOLICITACAO_PENDENTE.name),
        senhaHash: SENHA_DEMO_HASH,
        contratoId: contrato.id,
      },
    })
    console.log(`+ Solicitação pendente: ${SOLICITACAO_PENDENTE.name} (CNPJ ${SOLICITACAO_PENDENTE.cnpj})`)
  }

  console.log(
    `Demo concluída: ${criadas} empresas novas. Senha das empresas criadas agora: "${SENHA_DEMO_LAVA_RAPIDO}" ` +
      '(as que já existiam antes do I17 continuam com "admin").',
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
