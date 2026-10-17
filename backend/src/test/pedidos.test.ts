import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import * as pedidosService from '../modules/pedidos/pedidos.service.js'
import { comToken, tokenDeCliente, tokenDeLavaRapido } from './helpers/auth.js'
import {
  criarClienteTeste,
  criarItemServicoTeste,
  criarLavaRapidoTeste,
  criarPedidoTeste,
  criarServicoTeste,
  criarVeiculoTeste,
} from './helpers/factories.js'
import { limparDadosDeTeste } from './helpers/limpeza.js'

const app = createApp()

describe('/pedidos (painel, token de lava-rápido)', () => {
  let lavaRapidoId: string
  let token: string
  let pedidoId: string
  let pedidoDeOutraEmpresaId: string

  beforeAll(async () => {
    const lavaRapido = await criarLavaRapidoTeste()
    lavaRapidoId = lavaRapido.id
    token = tokenDeLavaRapido(lavaRapido)

    const pedido = await criarPedidoTeste(lavaRapidoId, { status: 'pendente' })
    pedidoId = pedido.id

    const outraEmpresa = await criarLavaRapidoTeste()
    pedidoDeOutraEmpresaId = (await criarPedidoTeste(outraEmpresa.id)).id
  })

  afterAll(async () => {
    await limparDadosDeTeste()
    await prisma.$disconnect()
  })

  it('GET /pedidos inclui cliente, veículo, serviços, total e duração (I13)', async () => {
    const response = await comToken(supertest(app).get('/pedidos'), token)

    const pedido = response.body.find((item: { id: string }) => item.id === pedidoId)
    expect(pedido).toMatchObject({
      precoTotal: 50,
      duracaoMinutos: 30,
      cliente: { id: expect.any(String), nome: expect.any(String) },
      veiculo: { id: expect.any(String), modelo: expect.any(String), placa: expect.any(String) },
      servicos: [{ nome: 'Lavagem de teste', preco: 50, duracaoMinutos: 30 }],
    })
    expect(pedido.cliente).not.toHaveProperty('email')
    expect(pedido.cliente).not.toHaveProperty('senha')
  })

  it('GET /pedidos lista só os pedidos da empresa do token', async () => {
    const response = await comToken(supertest(app).get('/pedidos'), token)

    expect(response.status).toBe(200)
    expect(response.body.every((item: { lavaRapidoId: string }) => item.lavaRapidoId === lavaRapidoId)).toBe(true)
    expect(response.body.find((item: { id: string }) => item.id === pedidoId)).toMatchObject({ lavaRapidoId, status: 'pendente' })
    expect(response.body.some((item: { id: string }) => item.id === pedidoDeOutraEmpresaId)).toBe(false)
  })

  // --- PATCH /pedidos/:id: aceite/recusa e transições (I15) ---

  const patch = (id: string, body: object, comTokenDe: string | null = token) => {
    const req = supertest(app).patch(`/pedidos/${id}`)
    return (comTokenDe ? comToken(req, comTokenDe) : req).send(body)
  }

  it('PATCH aceita um pedido pendente: 200 e statusAlteradoEm preenchido', async () => {
    const antes = Date.now()
    const response = await patch(pedidoId, { status: 'aceito' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: pedidoId, status: 'aceito', motivoRecusa: null })
    expect(new Date(response.body.statusAlteradoEm).getTime()).toBeGreaterThanOrEqual(antes - 1000)
    // Mantém o formato de resposta do I13.
    expect(response.body).toHaveProperty('servicos')
    expect(response.body.cliente).toHaveProperty('nome')
  })

  it('PATCH segue o fluxo aceito → em_andamento → concluido', async () => {
    const pedido = await criarPedidoTeste(lavaRapidoId, { status: 'aceito' })

    expect((await patch(pedido.id, { status: 'em_andamento' })).body.status).toBe('em_andamento')
    expect((await patch(pedido.id, { status: 'concluido' })).body.status).toBe('concluido')
  })

  it('PATCH recusa com motivo: motivo salvo; GET /pedidos expõe motivo e data', async () => {
    const pedido = await criarPedidoTeste(lavaRapidoId)
    const response = await patch(pedido.id, { status: 'recusado', motivo: '  Agenda cheia  ' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ status: 'recusado', motivoRecusa: 'Agenda cheia' })

    const lista = await comToken(supertest(app).get('/pedidos'), token)
    expect(lista.body.find((item: { id: string }) => item.id === pedido.id)).toMatchObject({
      status: 'recusado',
      motivoRecusa: 'Agenda cheia',
      statusAlteradoEm: expect.any(String),
    })
  })

  it('PATCH recusa sem motivo (opcional)', async () => {
    const pedido = await criarPedidoTeste(lavaRapidoId)
    const response = await patch(pedido.id, { status: 'recusado' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ status: 'recusado', motivoRecusa: null })
  })

  it.each([
    ['recusado', 'aceito', 'Não é possível mudar de recusado para aceito.'],
    ['pendente', 'concluido', 'Não é possível mudar de pendente para concluído.'],
    ['pendente', 'em_andamento', 'Não é possível mudar de pendente para em andamento.'],
    ['concluido', 'pendente', 'Não é possível mudar de concluído para pendente.'],
    ['aceito', 'aceito', 'O pedido já está aceito.'],
  ] as const)('PATCH %s → %s: 409 com mensagem clara e status inalterado', async (de, para, mensagem) => {
    const pedido = await criarPedidoTeste(lavaRapidoId, { status: de })
    const response = await patch(pedido.id, { status: para })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: mensagem, codigo: 'TRANSICAO_INVALIDA' })
    const depois = await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } })
    expect(depois.status).toBe(de)
    expect(depois.statusAlteradoEm).toBeNull()
  })

  it('PATCH com motivo acima de 200 caracteres → 400, nada muda', async () => {
    const pedido = await criarPedidoTeste(lavaRapidoId)
    const response = await patch(pedido.id, { status: 'recusado', motivo: 'a'.repeat(201) })

    expect(response.status).toBe(400)
    expect(response.body.codigo).toBe('DADOS_INVALIDOS')
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } })).status).toBe('pendente')
  })

  it('PATCH com motivo em status diferente de recusado → 400', async () => {
    const pedido = await criarPedidoTeste(lavaRapidoId)
    const response = await patch(pedido.id, { status: 'aceito', motivo: 'tanto faz' })

    expect(response.status).toBe(400)
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } })).status).toBe('pendente')
  })

  it('PATCH rejeita um status inexistente com 400', async () => {
    const response = await patch(pedidoId, { status: 'inexistente' })

    expect(response.status).toBe(400)
    expect(response.body.codigo).toBe('DADOS_INVALIDOS')
  })

  it('PATCH ignora outros campos do body', async () => {
    const pedido = await criarPedidoTeste(lavaRapidoId)
    const response = await patch(pedido.id, { status: 'aceito', precoTotal: 1, lavaRapidoId: 'outro' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ precoTotal: 50, lavaRapidoId })
  })

  it('PATCH retorna 404 para pedido inexistente e para pedido de outra empresa (sem alterar)', async () => {
    expect((await patch('id-que-nao-existe', { status: 'aceito' })).status).toBe(404)

    const response = await patch(pedidoDeOutraEmpresaId, { status: 'aceito' })
    expect(response.status).toBe(404)
    expect(response.body.codigo).toBe('PEDIDO_NAO_ENCONTRADO')
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoDeOutraEmpresaId } })).status).toBe('pendente')
  })

  it('PATCH sem token → 401; com token de cliente → 403', async () => {
    const pedido = await criarPedidoTeste(lavaRapidoId)
    const cliente = await criarClienteTeste()

    expect((await patch(pedido.id, { status: 'aceito' }, null)).status).toBe(401)
    expect((await patch(pedido.id, { status: 'aceito' }, tokenDeCliente(cliente))).status).toBe(403)
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } })).status).toBe('pendente')
  })

  it('PATCH concorrente: "Aceitar" e "Recusar" ao mesmo tempo, só um passa', async () => {
    const pedido = await criarPedidoTeste(lavaRapidoId)
    const respostas = await Promise.all([patch(pedido.id, { status: 'aceito' }), patch(pedido.id, { status: 'recusado' })])

    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409])
    const vencedor = respostas.find((r) => r.status === 200)!.body.status
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } })).status).toBe(vencedor)
  })

  describe('erro inesperado', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('GET /pedidos retorna 500 em vez de derrubar o processo quando o acesso a dados falha', async () => {
      vi.spyOn(pedidosService, 'listPedidos').mockRejectedValueOnce(new Error('falha inesperada no banco'))

      const response = await comToken(supertest(app).get('/pedidos'), token)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: 'Erro interno' })
    })
  })
})

// ---------------------------------------------------------------------------
// POST /pedidos (I13): cliente logado cria o pedido
// ---------------------------------------------------------------------------

/** ISO com fuso, daqui a `dias` dias. */
function daquiA(dias: number) {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString()
}

describe('POST /pedidos (cliente logado)', () => {
  let lavaRapidoId: string
  let tokenEmpresa: string
  let tokenEmpresaB: string
  let lavaRapidoBId: string
  let clienteId: string
  let clienteNome: string
  let tokenCliente: string
  let veiculoId: string
  let veiculoDeOutroClienteId: string
  let servicoAId: string // R$ 40,50 · 35 min
  let servicoBId: string // R$ 70 · 20 min
  let servicoInativoId: string
  let servicoDeOutraEmpresaId: string

  beforeAll(async () => {
    const lavaRapido = await criarLavaRapidoTeste()
    lavaRapidoId = lavaRapido.id
    tokenEmpresa = tokenDeLavaRapido(lavaRapido)
    const lavaRapidoB = await criarLavaRapidoTeste()
    lavaRapidoBId = lavaRapidoB.id
    tokenEmpresaB = tokenDeLavaRapido(lavaRapidoB)

    const lavagem = await criarItemServicoTeste({ duracaoMinutos: 20 })
    const aspiracao = await criarItemServicoTeste({ duracaoMinutos: 15 })
    servicoAId = (await criarServicoTeste(lavaRapidoId, { nome: 'Completa', preco: 40.5, itemIds: [lavagem.id, aspiracao.id] })).id
    servicoBId = (await criarServicoTeste(lavaRapidoId, { nome: 'Externa', preco: 70, itemIds: [lavagem.id] })).id
    servicoInativoId = (await criarServicoTeste(lavaRapidoId, { ativo: false, itemIds: [lavagem.id] })).id
    servicoDeOutraEmpresaId = (await criarServicoTeste(lavaRapidoBId, { itemIds: [lavagem.id] })).id

    const cliente = await criarClienteTeste()
    clienteId = cliente.id
    clienteNome = cliente.nome
    tokenCliente = tokenDeCliente(cliente)
    veiculoId = (await criarVeiculoTeste(clienteId)).id

    const outroCliente = await criarClienteTeste()
    veiculoDeOutroClienteId = (await criarVeiculoTeste(outroCliente.id)).id
  })

  afterAll(async () => {
    // Pedidos criados pela API não passam pelas factories: saem antes do
    // cliente/veículo (Restrict).
    await prisma.pedido.deleteMany({ where: { lavaRapidoId: { in: [lavaRapidoId, lavaRapidoBId] } } })
    await limparDadosDeTeste()
    await prisma.$disconnect()
  })

  function corpo(extra: Record<string, unknown> = {}) {
    return { lavaRapidoId, veiculoId, servicoIds: [servicoAId, servicoBId], horario: daquiA(2), ...extra }
  }

  function postar(body: unknown, tokenUsado: string | null = tokenCliente) {
    const req = supertest(app).post('/pedidos')
    return (tokenUsado ? comToken(req, tokenUsado) : req).send(body as object)
  }

  it('201: pedido pendente com total e duração somados no servidor e serviços congelados', async () => {
    const horario = daquiA(3)
    const response = await postar(corpo({ horario }))

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      lavaRapidoId,
      clienteId,
      veiculoId,
      status: 'pendente',
      precoTotal: 110.5,
      duracaoMinutos: 55,
      horario: new Date(horario).toISOString(),
      cliente: { id: clienteId, nome: clienteNome },
      veiculo: { id: veiculoId },
      servicos: [
        { servicoId: servicoAId, nome: 'Completa', preco: 40.5, duracaoMinutos: 35 },
        { servicoId: servicoBId, nome: 'Externa', preco: 70, duracaoMinutos: 20 },
      ],
    })

    const itens = await prisma.pedidoServico.findMany({ where: { pedidoId: response.body.id } })
    expect(itens).toHaveLength(2)
  })

  it('ignora preço, duração, status e cliente enviados no body', async () => {
    const outro = await criarClienteTeste()
    const response = await postar(
      corpo({ precoTotal: 1, preco: 1, duracaoMinutos: 1, status: 'concluido', clienteId: outro.id, servicos: [{ nome: 'x', preco: 0 }] }),
    )

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ clienteId, status: 'pendente', precoTotal: 110.5, duracaoMinutos: 55 })
    expect(response.body.servicos.map((s: { nome: string }) => s.nome)).toEqual(['Completa', 'Externa'])
  })

  it('mudar o preço/nome do serviço depois não altera o pedido já feito', async () => {
    const servico = await criarServicoTeste(lavaRapidoId, { nome: 'Promo', preco: 30, itemIds: [] })
    const criado = await postar(corpo({ servicoIds: [servico.id] }))
    expect(criado.status).toBe(201)

    await prisma.servico.update({ where: { id: servico.id }, data: { preco: 999, nome: 'Promo nova' } })

    const pedido = await prisma.pedido.findUnique({ where: { id: criado.body.id }, include: { servicos: true } })
    expect(pedido).toMatchObject({ precoTotal: 30, servicos: [{ nome: 'Promo', preco: 30 }] })
  })

  it('401 sem token; 403 com token de lava-rápido', async () => {
    expect((await postar(corpo(), null)).status).toBe(401)
    expect((await postar(corpo(), tokenEmpresa)).status).toBe(403)
  })

  it('404 para veículo de outro cliente (sem revelar que existe) e para veículo inexistente', async () => {
    const deOutro = await postar(corpo({ veiculoId: veiculoDeOutroClienteId }))
    const inexistente = await postar(corpo({ veiculoId: 'veiculo-que-nao-existe' }))

    for (const response of [deOutro, inexistente]) {
      expect(response.status).toBe(404)
      expect(response.body).toEqual({ error: 'Veículo não encontrado', codigo: 'VEICULO_NAO_ENCONTRADO' })
    }
  })

  it('400 para serviço inativo, de outro lava-rápido ou inexistente, com os ids recusados', async () => {
    const response = await postar(corpo({ servicoIds: [servicoAId, servicoInativoId, servicoDeOutraEmpresaId, 'nao-existe'] }))

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      codigo: 'SERVICO_INVALIDO',
      servicoIdsInvalidos: [servicoInativoId, servicoDeOutraEmpresaId, 'nao-existe'],
    })
  })

  it('400 para serviço inativo sozinho', async () => {
    const response = await postar(corpo({ servicoIds: [servicoInativoId] }))
    expect(response.status).toBe(400)
    expect(response.body.codigo).toBe('SERVICO_INVALIDO')
  })

  it('400 para serviço de outro lava-rápido sozinho', async () => {
    const response = await postar(corpo({ servicoIds: [servicoDeOutraEmpresaId] }))
    expect(response.status).toBe(400)
    expect(response.body.codigo).toBe('SERVICO_INVALIDO')
  })

  it('404 para lava-rápido inexistente', async () => {
    const response = await postar(corpo({ lavaRapidoId: 'lava-rapido-que-nao-existe' }))

    expect(response.status).toBe(404)
    expect(response.body.codigo).toBe('LAVA_RAPIDO_NAO_ENCONTRADO')
  })

  it.each([
    ['vazia', []],
    ['com serviço repetido', ['__A__', '__A__']],
    ['que não é lista', 'abc'],
    ['ausente', undefined],
  ])('400 para lista de serviços %s', async (_nome, servicoIds) => {
    const ids = Array.isArray(servicoIds) ? servicoIds.map((id) => (id === '__A__' ? servicoAId : id)) : servicoIds
    const response = await postar(corpo({ servicoIds: ids }))

    expect(response.status).toBe(400)
    expect(response.body.codigo).toBe('DADOS_INVALIDOS')
  })

  it('400 para horário no passado', async () => {
    const response = await postar(corpo({ horario: daquiA(-1) }))

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Escolha uma data e hora no futuro', codigo: 'HORARIO_PASSADO' })
  })

  it.each(['amanhã às 10h', '2030-01-01', '2030-01-01T10:00:00', '2030-02-31T10:00:00Z'])(
    '400 para horário inválido ou sem fuso (%s)',
    async (horario) => {
      const response = await postar(corpo({ horario }))
      expect(response.status).toBe(400)
      expect(response.body.codigo).toBe('DADOS_INVALIDOS')
    },
  )

  it('aceita horário com offset (-03:00) e grava o instante em UTC', async () => {
    const response = await postar(corpo({ horario: '2030-03-04T10:30:00-03:00' }))

    expect(response.status).toBe(201)
    expect(response.body.horario).toBe('2030-03-04T13:30:00.000Z')
  })

  it('400 sem lava-rápido ou sem veículo', async () => {
    expect((await postar(corpo({ lavaRapidoId: '' }))).status).toBe(400)
    expect((await postar(corpo({ veiculoId: undefined }))).status).toBe(400)
  })

  it('não grava nada quando recusa', async () => {
    const antes = await prisma.pedido.count({ where: { clienteId } })
    await postar(corpo({ servicoIds: [servicoInativoId] }))
    await postar(corpo({ horario: daquiA(-1) }))
    expect(await prisma.pedido.count({ where: { clienteId } })).toBe(antes)
  })

  it('o pedido criado aparece no GET /pedidos só do lava-rápido escolhido, com o nome do cliente', async () => {
    const criado = await postar(corpo())
    expect(criado.status).toBe(201)

    const daEmpresa = await comToken(supertest(app).get('/pedidos'), tokenEmpresa)
    const daOutra = await comToken(supertest(app).get('/pedidos').query({ lavaRapidoId }), tokenEmpresaB)

    expect(daEmpresa.body.find((p: { id: string }) => p.id === criado.body.id)).toMatchObject({
      cliente: { nome: clienteNome },
      precoTotal: 110.5,
    })
    expect(daOutra.body.some((p: { id: string }) => p.id === criado.body.id)).toBe(false)
  })

  describe('erro inesperado', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('POST /pedidos retorna 500 quando a criação falha', async () => {
      vi.spyOn(pedidosService, 'criarPedido').mockRejectedValueOnce(new Error('falha inesperada no banco'))

      const response = await postar(corpo())

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: 'Erro interno' })
    })
  })
})
