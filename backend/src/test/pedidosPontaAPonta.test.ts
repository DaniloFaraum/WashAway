import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { comToken, tokenDeLavaRapido } from './helpers/auth.js'
import { criarItemServicoTeste, criarLavaRapidoTeste, criarServicoTeste, sufixoUnico } from './helpers/factories.js'
import { limparDadosDeTeste, registrarParaLimpeza } from './helpers/limpeza.js'

const app = createApp()

// I13 — ponta a ponta via API (critério obrigatório): o cliente se cadastra,
// entra, cadastra o veículo, escolhe os serviços de um lava-rápido e confirma o
// pedido; o pedido aparece no painel DO LAVA-RÁPIDO ESCOLHIDO (e não no outro)
// com nome do cliente, veículo, serviços, horário e total. É o mesmo caminho
// de chamadas que o app faz (cadastro/login → /clientes/me/veiculos →
// /servicos?lavaRapidoId= → POST /pedidos) e que o painel faz (GET /pedidos).
// O painel usa o token de lava-rápido gerado direto (o login da empresa tem os
// testes dele em lavaRapidos.test.ts).
describe('Ponta a ponta: pedido criado no app aparece no painel do lava-rápido escolhido', () => {
  let escolhidoId: string
  let outroId: string
  const email = `ponta-a-ponta-${sufixoUnico()}@teste.washaway.dev`

  beforeAll(async () => {
    const escolhido = await criarLavaRapidoTeste({ name: `Lava escolhido ${sufixoUnico()}` })
    const outro = await criarLavaRapidoTeste()
    escolhidoId = escolhido.id
    outroId = outro.id

    const lavagem = await criarItemServicoTeste({ duracaoMinutos: 30 })
    const cera = await criarItemServicoTeste({ duracaoMinutos: 45 })
    await criarServicoTeste(escolhidoId, { nome: 'Lavagem completa', preco: 80, itemIds: [lavagem.id] })
    await criarServicoTeste(escolhidoId, { nome: 'Enceramento', preco: 59.9, itemIds: [cera.id] })
    await criarServicoTeste(outroId, { nome: 'Lavagem completa', preco: 10, itemIds: [lavagem.id] })
  })

  afterAll(async () => {
    const cliente = await prisma.cliente.findUnique({ where: { email } })
    if (cliente) {
      await prisma.pedido.deleteMany({ where: { clienteId: cliente.id } })
      registrarParaLimpeza('cliente', cliente.id) // veículos saem em cascata
    }
    await limparDadosDeTeste()
    await prisma.$disconnect()
  })

  it('cadastro → login → veículo → serviços → data/hora → confirmar → painel', async () => {
    // 1. Cadastro e login do cliente (I1/I2)
    const cadastro = await supertest(app)
      .post('/auth/cliente/cadastro')
      .send({ nome: 'Cliente Ponta a Ponta', email, senha: 'senha-segura-123' })
    expect(cadastro.status).toBe(201)
    const login = await supertest(app).post('/auth/cliente/login').send({ email, senha: 'senha-segura-123' })
    expect(login.status).toBe(200)
    const tokenCliente: string = login.body.token

    // 2. Veículo (I3)
    const veiculo = await comToken(supertest(app).post('/clientes/me/veiculos'), tokenCliente).send({
      marca: 'Fiat',
      modelo: 'Argo',
      cor: 'Branco',
      placa: 'abc-1d23',
    })
    expect(veiculo.status).toBe(201)
    const meusVeiculos = await comToken(supertest(app).get('/clientes/me/veiculos'), tokenCliente)
    expect(meusVeiculos.body.map((v: { id: string }) => v.id)).toContain(veiculo.body.id)

    // 3. Serviços do lava-rápido escolhido (rota pública que o app usa)
    const servicos = await supertest(app).get('/servicos').query({ lavaRapidoId: escolhidoId })
    expect(servicos.status).toBe(200)
    const servicoIds = servicos.body.map((s: { id: string }) => s.id)
    expect(servicoIds).toHaveLength(2)

    // 4. Data/hora (amanhã, 10:00 em São Paulo) e confirmação
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const horario = `${amanha}T10:00:00-03:00`
    const pedido = await comToken(supertest(app).post('/pedidos'), tokenCliente).send({
      lavaRapidoId: escolhidoId,
      veiculoId: veiculo.body.id,
      servicoIds,
      horario,
      precoTotal: 0.01, // ignorado
    })
    expect(pedido.status).toBe(201)
    expect(pedido.body).toMatchObject({ status: 'pendente', precoTotal: 139.9, duracaoMinutos: 75 })

    // 5. Painel do lava-rápido escolhido: vê o pedido com cliente, veículo, serviços, horário e total
    const painel = await comToken(supertest(app).get('/pedidos'), tokenDeLavaRapido({ id: escolhidoId }))
    expect(painel.status).toBe(200)
    expect(painel.body.find((p: { id: string }) => p.id === pedido.body.id)).toMatchObject({
      status: 'pendente',
      horario: new Date(horario).toISOString(),
      precoTotal: 139.9,
      duracaoMinutos: 75,
      cliente: { nome: 'Cliente Ponta a Ponta' },
      veiculo: { marca: 'Fiat', modelo: 'Argo', cor: 'Branco', placa: 'ABC1D23' },
      servicos: [
        { nome: servicos.body[0].nome, preco: servicos.body[0].preco },
        { nome: servicos.body[1].nome, preco: servicos.body[1].preco },
      ],
    })
    const veiculosDoPainel = await comToken(supertest(app).get('/veiculos'), tokenDeLavaRapido({ id: escolhidoId }))
    expect(veiculosDoPainel.body.map((v: { id: string }) => v.id)).toContain(veiculo.body.id)

    // 6. …e não no painel de outro lava-rápido
    const outroPainel = await comToken(supertest(app).get('/pedidos'), tokenDeLavaRapido({ id: outroId }))
    expect(outroPainel.body.some((p: { id: string }) => p.id === pedido.body.id)).toBe(false)

    // 7. O veículo com pedido não pode mais ser removido (o histórico não some)
    const remover = await comToken(supertest(app).delete(`/clientes/me/veiculos/${veiculo.body.id}`), tokenCliente)
    expect(remover.status).toBe(409)
  })
})
