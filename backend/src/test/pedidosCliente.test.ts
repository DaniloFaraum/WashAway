import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { comToken, tokenDeCliente, tokenDeLavaRapido } from './helpers/auth.js'
import { criarClienteTeste, criarLavaRapidoTeste, criarPedidoTeste, criarVeiculoTeste } from './helpers/factories.js'
import { limparDadosDeTeste } from './helpers/limpeza.js'

// I18: pedidos do cliente logado (/clientes/me/pedidos) e contador de recusas
// não vistas (/clientes/me/notificacoes). O cliente vem sempre do token.

const app = createApp()
const ROTA = '/clientes/me/pedidos'

type Cliente = Awaited<ReturnType<typeof criarClienteTeste>>
type LavaRapido = Awaited<ReturnType<typeof criarLavaRapidoTeste>>
let clienteA: Cliente
let clienteB: Cliente
let lavaRapido: LavaRapido
let tokenA: string
let tokenB: string
const pedidosA: Record<string, string> = {}
let pedidoDeB: string

const DIA = 24 * 60 * 60 * 1000
const daqui = (dias: number) => new Date(Date.now() + dias * DIA)

beforeAll(async () => {
  clienteA = await criarClienteTeste()
  clienteB = await criarClienteTeste()
  tokenA = tokenDeCliente(clienteA)
  tokenB = tokenDeCliente(clienteB)
  lavaRapido = await criarLavaRapidoTeste({ address: 'Rua de Teste, 10' })
  const veiculoA = await criarVeiculoTeste(clienteA.id)
  const veiculoB = await criarVeiculoTeste(clienteB.id)
  const doA = { clienteId: clienteA.id, veiculoId: veiculoA.id }

  // Criados fora de ordem de horário, para conferir a ordenação.
  pedidosA.futuroAceito = (await criarPedidoTeste(lavaRapido.id, { ...doA, horario: daqui(5), status: 'aceito', statusAlteradoEm: daqui(-1) })).id
  pedidosA.passadoConcluido = (await criarPedidoTeste(lavaRapido.id, { ...doA, horario: daqui(-10), status: 'concluido' })).id
  pedidosA.futuroRecusado = (await criarPedidoTeste(lavaRapido.id, {
    ...doA,
    horario: daqui(3),
    status: 'recusado',
    motivoRecusa: 'Agenda cheia',
    statusAlteradoEm: daqui(-1),
  })).id
  pedidosA.futuroPendente = (await criarPedidoTeste(lavaRapido.id, { ...doA, horario: daqui(1) })).id
  pedidosA.recusadoVisto = (await criarPedidoTeste(lavaRapido.id, {
    ...doA,
    horario: daqui(-2),
    status: 'recusado',
    statusAlteradoEm: daqui(-3),
    recusaVistaEm: daqui(-2),
  })).id

  pedidoDeB = (await criarPedidoTeste(lavaRapido.id, { clienteId: clienteB.id, veiculoId: veiculoB.id, horario: daqui(2), status: 'recusado' })).id
})

afterAll(async () => {
  await limparDadosDeTeste()
  await prisma.$disconnect()
})

describe('GET /clientes/me/pedidos', () => {
  it('só devolve os pedidos do cliente do token, ordenados por horário', async () => {
    const response = await comToken(supertest(app).get(ROTA), tokenA)

    expect(response.status).toBe(200)
    const ids = response.body.map((pedido: { id: string }) => pedido.id)
    expect(ids).toEqual([
      pedidosA.passadoConcluido,
      pedidosA.recusadoVisto,
      pedidosA.futuroPendente,
      pedidosA.futuroRecusado,
      pedidosA.futuroAceito,
    ])
    expect(ids).not.toContain(pedidoDeB)
  })

  it('traz lava-rápido, veículo, serviços, total, status e quando', async () => {
    const response = await comToken(supertest(app).get(ROTA), tokenA)
    const porId = new Map(response.body.map((pedido: { id: string }) => [pedido.id, pedido]))

    expect(porId.get(pedidosA.futuroAceito)).toMatchObject({
      status: 'aceito',
      precoTotal: 50,
      quando: 'proximo',
      lavaRapido: { id: lavaRapido.id, nome: lavaRapido.name, endereco: 'Rua de Teste, 10' },
      veiculo: { placa: expect.any(String), modelo: expect.any(String) },
      servicos: [{ nome: 'Lavagem de teste', preco: 50 }],
    })
    expect(porId.get(pedidosA.futuroRecusado)).toMatchObject({ status: 'recusado', motivoRecusa: 'Agenda cheia', quando: 'anterior' })
    expect(porId.get(pedidosA.passadoConcluido)).toMatchObject({ quando: 'anterior' })
    expect(porId.get(pedidosA.futuroPendente)).not.toHaveProperty('fotos')
  })

  it('cliente sem pedidos recebe lista vazia', async () => {
    const semPedidos = await criarClienteTeste()
    const response = await comToken(supertest(app).get(ROTA), tokenDeCliente(semPedidos))
    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it('sem token: 401', async () => {
    expect((await supertest(app).get(ROTA)).status).toBe(401)
  })

  it('token de lava-rápido: 403', async () => {
    const response = await comToken(supertest(app).get(ROTA), tokenDeLavaRapido(lavaRapido))
    expect(response.status).toBe(403)
  })
})

describe('GET /clientes/me/pedidos/:id', () => {
  it('devolve o detalhe do próprio pedido', async () => {
    const response = await comToken(supertest(app).get(`${ROTA}/${pedidosA.futuroRecusado}`), tokenA)
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: pedidosA.futuroRecusado, status: 'recusado', motivoRecusa: 'Agenda cheia' })
  })

  it('pedido de outro cliente: 404 (e não 403)', async () => {
    const response = await comToken(supertest(app).get(`${ROTA}/${pedidoDeB}`), tokenA)
    expect(response.status).toBe(404)
  })

  it('pedido inexistente: 404', async () => {
    expect((await comToken(supertest(app).get(`${ROTA}/nao-existe`), tokenA)).status).toBe(404)
  })

  it('sem token: 401; token de lava-rápido: 403', async () => {
    expect((await supertest(app).get(`${ROTA}/${pedidosA.futuroAceito}`)).status).toBe(401)
    expect((await comToken(supertest(app).get(`${ROTA}/${pedidosA.futuroAceito}`), tokenDeLavaRapido(lavaRapido))).status).toBe(403)
  })
})

describe('recusas não vistas (GET /clientes/me/notificacoes + POST /clientes/me/pedidos/:id/visto)', () => {
  async function contador(token: string) {
    const response = await comToken(supertest(app).get('/clientes/me/notificacoes'), token)
    expect(response.status).toBe(200)
    return response.body.recusasNaoVistas as number
  }

  it('conta só as recusas não vistas do próprio cliente', async () => {
    expect(await contador(tokenA)).toBe(1)
    expect(await contador(tokenB)).toBe(1)
  })

  it('marcar pedido de outro cliente: 404 e o contador dele não muda', async () => {
    const response = await comToken(supertest(app).post(`${ROTA}/${pedidoDeB}/visto`), tokenA)
    expect(response.status).toBe(404)
    expect(await contador(tokenB)).toBe(1)
  })

  it('marcar pedido não recusado: 204 sem mudar nada', async () => {
    const response = await comToken(supertest(app).post(`${ROTA}/${pedidosA.futuroAceito}/visto`), tokenA)
    expect(response.status).toBe(204)
    const pedido = await prisma.pedido.findUniqueOrThrow({ where: { id: pedidosA.futuroAceito } })
    expect(pedido.recusaVistaEm).toBeNull()
  })

  it('marcar a recusa como vista zera o item no contador (e é idempotente)', async () => {
    const primeira = await comToken(supertest(app).post(`${ROTA}/${pedidosA.futuroRecusado}/visto`), tokenA)
    expect(primeira.status).toBe(204)
    const vistaEm = (await prisma.pedido.findUniqueOrThrow({ where: { id: pedidosA.futuroRecusado } })).recusaVistaEm
    expect(vistaEm).toBeInstanceOf(Date)
    expect(await contador(tokenA)).toBe(0)

    const segunda = await comToken(supertest(app).post(`${ROTA}/${pedidosA.futuroRecusado}/visto`), tokenA)
    expect(segunda.status).toBe(204)
    const depois = (await prisma.pedido.findUniqueOrThrow({ where: { id: pedidosA.futuroRecusado } })).recusaVistaEm
    expect(depois).toEqual(vistaEm)
  })

  it('nova recusa aumenta o contador', async () => {
    const veiculo = await criarVeiculoTeste(clienteA.id)
    await criarPedidoTeste(lavaRapido.id, { clienteId: clienteA.id, veiculoId: veiculo.id, horario: daqui(4), status: 'recusado' })
    expect(await contador(tokenA)).toBe(1)
  })

  it('sem token: 401; token de lava-rápido: 403', async () => {
    expect((await supertest(app).get('/clientes/me/notificacoes')).status).toBe(401)
    expect((await supertest(app).post(`${ROTA}/${pedidosA.futuroRecusado}/visto`)).status).toBe(401)
    expect((await comToken(supertest(app).get('/clientes/me/notificacoes'), tokenDeLavaRapido(lavaRapido))).status).toBe(403)
  })
})
