import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import * as pedidosService from '../modules/pedidos/pedidos.service.js'
import { comToken, tokenDeLavaRapido } from './helpers/auth.js'
import { criarLavaRapidoTeste, criarPedidoTeste } from './helpers/factories.js'
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

  it('GET /pedidos lista só os pedidos da empresa do token', async () => {
    const response = await comToken(supertest(app).get('/pedidos'), token)

    expect(response.status).toBe(200)
    expect(response.body.every((item: { lavaRapidoId: string }) => item.lavaRapidoId === lavaRapidoId)).toBe(true)
    expect(response.body.find((item: { id: string }) => item.id === pedidoId)).toMatchObject({ lavaRapidoId, status: 'pendente' })
    expect(response.body.some((item: { id: string }) => item.id === pedidoDeOutraEmpresaId)).toBe(false)
  })

  it('PATCH /pedidos/:id atualiza o status', async () => {
    const response = await comToken(supertest(app).patch(`/pedidos/${pedidoId}`), token).send({ status: 'em_andamento' })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('em_andamento')
  })

  it('PATCH /pedidos/:id rejeita um status inválido', async () => {
    const response = await comToken(supertest(app).patch(`/pedidos/${pedidoId}`), token).send({ status: 'inexistente' })

    expect(response.status).toBe(400)
  })

  it('PATCH /pedidos/:id retorna 404 para um pedido inexistente', async () => {
    const response = await comToken(supertest(app).patch('/pedidos/id-que-nao-existe'), token).send({ status: 'concluido' })

    expect(response.status).toBe(404)
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
