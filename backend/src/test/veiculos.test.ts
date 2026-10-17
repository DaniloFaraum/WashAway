import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import * as veiculosService from '../modules/veiculos/veiculos.service.js'
import { comToken, tokenDeLavaRapido } from './helpers/auth.js'
import { criarClienteTeste, criarLavaRapidoTeste, criarPedidoTeste, criarVeiculoTeste } from './helpers/factories.js'
import { limparDadosDeTeste } from './helpers/limpeza.js'

const app = createApp()

// GET /veiculos do painel (I13): veículos distintos dos pedidos da empresa,
// pela relação Pedido → Veiculo (não mais o JSON antigo do pedido).
describe('/veiculos', () => {
  let token: string
  let outroLavaRapidoId: string
  let argoId: string
  let golId: string
  let veiculoDeOutraEmpresaId: string
  let veiculoSemPedidoId: string

  beforeAll(async () => {
    const lavaRapido = await criarLavaRapidoTeste()
    token = tokenDeLavaRapido(lavaRapido)

    const outro = await criarLavaRapidoTeste()
    outroLavaRapidoId = outro.id

    const cliente = await criarClienteTeste()
    const argo = await criarVeiculoTeste(cliente.id, { modelo: 'Argo', marca: 'Fiat' })
    const gol = await criarVeiculoTeste(cliente.id, { modelo: 'Gol', marca: 'VW' })
    const semPedido = await criarVeiculoTeste(cliente.id)
    argoId = argo.id
    golId = gol.id
    veiculoSemPedidoId = semPedido.id

    // Duas visitas do mesmo carro — deve aparecer uma vez só.
    await criarPedidoTeste(lavaRapido.id, { clienteId: cliente.id, veiculoId: argo.id })
    await criarPedidoTeste(lavaRapido.id, { clienteId: cliente.id, veiculoId: argo.id })
    await criarPedidoTeste(lavaRapido.id, { clienteId: cliente.id, veiculoId: gol.id })

    const pedidoDeOutra = await criarPedidoTeste(outroLavaRapidoId)
    veiculoDeOutraEmpresaId = pedidoDeOutra.veiculoId
  })

  afterAll(async () => {
    await limparDadosDeTeste()
    await prisma.$disconnect()
  })

  it('GET /veiculos lista os veículos distintos dos pedidos da empresa do token', async () => {
    const response = await comToken(supertest(app).get('/veiculos'), token)

    expect(response.status).toBe(200)
    const ids = response.body.map((v: { id: string }) => v.id)
    expect(ids.filter((id: string) => id === argoId)).toHaveLength(1)
    expect(ids).toContain(golId)
    expect(ids).not.toContain(veiculoSemPedidoId)
    expect(response.body.find((v: { id: string }) => v.id === argoId)).toMatchObject({ modelo: 'Argo', marca: 'Fiat' })
  })

  it('GET /veiculos ignora ?lavaRapidoId= e não traz veículos de outra empresa', async () => {
    const response = await comToken(supertest(app).get('/veiculos').query({ lavaRapidoId: outroLavaRapidoId }), token)

    expect(response.status).toBe(200)
    const ids = response.body.map((v: { id: string }) => v.id)
    expect(ids).toContain(argoId)
    expect(ids).not.toContain(veiculoDeOutraEmpresaId)
  })

  describe('erro inesperado', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('GET /veiculos retorna 500 em vez de derrubar o processo quando o acesso a dados falha', async () => {
      vi.spyOn(veiculosService, 'listVeiculos').mockRejectedValueOnce(new Error('falha inesperada no banco'))

      const response = await comToken(supertest(app).get('/veiculos'), token)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: 'Erro interno' })
    })
  })
})
