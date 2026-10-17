import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { partesLocais } from '../utils/fusoHorario.js'
import jwt from 'jsonwebtoken'
import { comToken, tokenDeLavaRapido } from './helpers/auth.js'
import { criarLavaRapidoTeste, criarPedidoTeste } from './helpers/factories.js'
import { limparDadosDeTeste } from './helpers/limpeza.js'

const app = createApp()

describe('GET /lavaRapidos', () => {
  let lavaRapidoId: string

  beforeAll(async () => {
    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido de teste',
        cnpj: '11111111000111',
        senha: 'hash-fake-nao-usado-nestes-testes',
        rating: 4.5,
        reviewsCount: 10,
        distance: '1 km',
        time: '5 min',
        price: 50,
        isOpen: true,
        image: 'https://placehold.co/300x300?text=Teste',
        latitude: 0,
        longitude: 0,
      },
    })
    lavaRapidoId = lavaRapido.id
  })

  afterAll(async () => {
    await prisma.lavaRapido.deleteMany({ where: { id: lavaRapidoId } })
    await prisma.$disconnect()
  })

  it('lista os lava-rápidos cadastrados', async () => {
    const response = await supertest(app).get('/lavaRapidos')

    expect(response.status).toBe(200)
    expect(response.body.some((item: { id: string }) => item.id === lavaRapidoId)).toBe(true)
  })

  it('busca um lava-rápido por id', async () => {
    const response = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: lavaRapidoId, name: 'Lava-rápido de teste' })
  })

  it('não inclui senha na listagem', async () => {
    const response = await supertest(app).get('/lavaRapidos')

    const item = response.body.find((entry: { id: string }) => entry.id === lavaRapidoId)
    expect(item.senha).toBeUndefined()
  })

  it('não inclui senha na busca por id', async () => {
    const response = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)

    expect(response.body.senha).toBeUndefined()
  })

  it('não expõe o e-mail de acesso nas rotas públicas', async () => {
    await prisma.lavaRapido.update({ where: { id: lavaRapidoId }, data: { email: `acesso-${lavaRapidoId}@exemplo.com` } })

    const lista = await supertest(app).get('/lavaRapidos')
    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)

    const item = lista.body.find((entry: { id: string }) => entry.id === lavaRapidoId)
    expect(item).not.toHaveProperty('email')
    expect(show.body).not.toHaveProperty('email')
  })

  it('retorna 404 para um id inexistente', async () => {
    const response = await supertest(app).get('/lavaRapidos/id-que-nao-existe')

    expect(response.status).toBe(404)
  })
})

describe('rotas legadas removidas (I17): POST /lavaRapidos e DELETE /lavaRapidos/:id', () => {
  afterAll(async () => {
    await limparDadosDeTeste()
  })

  it('POST /lavaRapidos não existe mais (empresa nova só pelo onboarding)', async () => {
    const cnpj = '33333333000133'
    const response = await supertest(app).post('/lavaRapidos').send({ name: 'Empresa legado', cnpj })

    expect(response.status).toBe(404)
    expect(await prisma.lavaRapido.findUnique({ where: { cnpj } })).toBeNull()
  })

  it('DELETE /lavaRapidos/:id não existe mais: a empresa continua lá, com ou sem token', async () => {
    const lavaRapido = await criarLavaRapidoTeste()

    const semToken = await supertest(app).delete(`/lavaRapidos/${lavaRapido.id}`)
    const comTokenDaPropria = await comToken(supertest(app).delete(`/lavaRapidos/${lavaRapido.id}`), tokenDeLavaRapido(lavaRapido))

    expect(semToken.status).toBe(404)
    expect(comTokenDaPropria.status).toBe(404)
    expect(await prisma.lavaRapido.findUnique({ where: { id: lavaRapido.id } })).not.toBeNull()
  })
})

describe('exclusão de lava-rápido no banco (cascade)', () => {
  it('apagar a empresa apaga pedidos, serviços e intercorrências junto', async () => {
    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido com dependentes',
        cnpj: '88888888000188',
        senha: 'hash-fake-nao-usado-nestes-testes',
        rating: 0,
        reviewsCount: 0,
        distance: '',
        time: '',
        price: 0,
        isOpen: true,
        image: 'https://placehold.co/300x300?text=Dependentes',
        latitude: 0,
        longitude: 0,
      },
    })

    const pedido = await criarPedidoTeste(lavaRapido.id)
    const servico = await prisma.servico.create({
      data: { lavaRapidoId: lavaRapido.id, nome: 'Lavagem', preco: 40 },
    })
    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId: lavaRapido.id, data: '2026-12-01', motivo: 'Teste', diaInteiro: true },
    })

    await prisma.lavaRapido.delete({ where: { id: lavaRapido.id } })

    expect(await prisma.pedido.findUnique({ where: { id: pedido.id } })).toBeNull()
    expect(await prisma.servico.findUnique({ where: { id: servico.id } })).toBeNull()
    expect(await prisma.intercorrencia.findUnique({ where: { id: intercorrencia.id } })).toBeNull()
  })
})

describe('isOpen calculado a partir de intercorrências', () => {
  let lavaRapidoId: string

  // Data/hora no fuso dos lava-rápidos (America/Sao_Paulo), igual ao backend —
  // não UTC (toISOString) nem o fuso da máquina (toTimeString).
  function horaFormatada(data: Date): string {
    return partesLocais(data).hora
  }

  beforeAll(async () => {
    const lavaRapido = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido do teste de isOpen',
        cnpj: '55555555000155',
        senha: 'hash-fake-nao-usado-nestes-testes',
        rating: 4.5,
        reviewsCount: 10,
        distance: '1 km',
        time: '5 min',
        price: 50,
        isOpen: true,
        image: 'https://placehold.co/300x300?text=Teste',
        latitude: 0,
        longitude: 0,
      },
    })
    lavaRapidoId = lavaRapido.id
  })

  afterAll(async () => {
    await prisma.intercorrencia.deleteMany({ where: { lavaRapidoId } })
    await prisma.lavaRapido.deleteMany({ where: { id: lavaRapidoId } })
  })

  it('fica isOpen: false com intercorrência de dia inteiro hoje', async () => {
    const hoje = partesLocais(new Date()).data
    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: hoje, motivo: 'Folga', diaInteiro: true },
    })

    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)
    expect(show.body.isOpen).toBe(false)
    expect(show.body.intercorrenciaAtiva).toMatchObject({ id: intercorrencia.id, motivo: 'Folga' })

    const index = await supertest(app).get('/lavaRapidos')
    const item = index.body.find((entry: { id: string }) => entry.id === lavaRapidoId)
    expect(item.isOpen).toBe(false)

    await prisma.intercorrencia.delete({ where: { id: intercorrencia.id } })
  })

  it('fica isOpen: false com intercorrência parcial cujo intervalo inclui o horário atual', async () => {
    const agora = new Date()
    const hoje = partesLocais(agora).data
    const inicio = horaFormatada(new Date(agora.getTime() - 60_000))
    const fim = horaFormatada(new Date(agora.getTime() + 60_000))

    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: hoje, motivo: 'Manutenção', diaInteiro: false, horaInicio: inicio, horaFim: fim },
    })

    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)
    expect(show.body.isOpen).toBe(false)
    expect(show.body.intercorrenciaAtiva?.id).toBe(intercorrencia.id)

    await prisma.intercorrencia.delete({ where: { id: intercorrencia.id } })
  })

  it('não muda isOpen com intercorrência parcial fora do horário atual', async () => {
    const agora = new Date()
    const hoje = partesLocais(agora).data
    const inicio = horaFormatada(new Date(agora.getTime() + 2 * 60 * 60_000))
    const fim = horaFormatada(new Date(agora.getTime() + 3 * 60 * 60_000))

    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: hoje, motivo: 'Mais tarde', diaInteiro: false, horaInicio: inicio, horaFim: fim },
    })

    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)
    expect(show.body.isOpen).toBe(true)
    expect(show.body.intercorrenciaAtiva).toBeNull()

    await prisma.intercorrencia.delete({ where: { id: intercorrencia.id } })
  })

  it('não muda isOpen com intercorrência de outro dia', async () => {
    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: '2099-01-01', motivo: 'Futuro distante', diaInteiro: true },
    })

    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)
    expect(show.body.isOpen).toBe(true)

    await prisma.intercorrencia.delete({ where: { id: intercorrencia.id } })
  })

  it('intercorrência marcada reaberta: true deixa de fechar o isOpen', async () => {
    const hoje = partesLocais(new Date()).data
    const intercorrencia = await prisma.intercorrencia.create({
      data: { lavaRapidoId, data: hoje, motivo: 'Folga cancelada', diaInteiro: true },
    })

    const reabrir = await comToken(supertest(app).patch(`/intercorrencias/${intercorrencia.id}`), tokenDeLavaRapido({ id: lavaRapidoId })).send({
      reaberta: true,
    })
    expect(reabrir.status).toBe(200)

    const show = await supertest(app).get(`/lavaRapidos/${lavaRapidoId}`)
    expect(show.body.isOpen).toBe(true)
    expect(show.body.intercorrenciaAtiva).toBeNull()

    await prisma.intercorrencia.delete({ where: { id: intercorrencia.id } })
  })

  it('lava-rápido com isOpen: false no banco continua false mesmo sem intercorrência', async () => {
    const fechado = await prisma.lavaRapido.create({
      data: {
        name: 'Lava-rápido fechado no cadastro',
        cnpj: '66666666000166',
        senha: 'hash-fake-nao-usado-nestes-testes',
        rating: 0,
        reviewsCount: 0,
        distance: '',
        time: '',
        price: 0,
        isOpen: false,
        image: 'https://placehold.co/300x300?text=Fechado',
        latitude: 0,
        longitude: 0,
      },
    })

    const show = await supertest(app).get(`/lavaRapidos/${fechado.id}`)
    expect(show.body.isOpen).toBe(false)

    await prisma.lavaRapido.delete({ where: { id: fechado.id } })
  })
})

describe('POST /lavaRapidos/login', () => {
  const SENHA = 'senha-forte-123'
  let lavaRapido: Awaited<ReturnType<typeof criarLavaRapidoTeste>>

  beforeAll(async () => {
    lavaRapido = await criarLavaRapidoTeste({ senha: SENHA })
  })

  afterAll(async () => {
    await limparDadosDeTeste()
  })

  it('loga com cnpj + senha e devolve { token, expiraEm, lavaRapido } com horários e disponibilidade', async () => {
    const response = await supertest(app).post('/lavaRapidos/login').send({ cnpj: lavaRapido.cnpj, senha: SENHA })

    expect(response.status).toBe(200)
    expect(response.body.token).toEqual(expect.any(String))
    expect(response.body.expiraEm).toEqual(expect.any(String))
    expect(response.body.lavaRapido).toMatchObject({ id: lavaRapido.id, cnpj: lavaRapido.cnpj, isOpen: true, foraDoHorario: false })
    expect(response.body.lavaRapido.horarios).toEqual(expect.any(Array))
    expect(response.body.lavaRapido.senha).toBeUndefined()

    const payload = jwt.decode(response.body.token) as jwt.JwtPayload
    expect(payload).toMatchObject({ sub: lavaRapido.id, tipo: 'lavaRapido' })
  })

  it('o token do login abre as rotas do painel', async () => {
    const login = await supertest(app).post('/lavaRapidos/login').send({ cnpj: lavaRapido.cnpj, senha: SENHA })

    const pedidos = await comToken(supertest(app).get('/pedidos'), login.body.token)

    expect(pedidos.status).toBe(200)
  })

  it('rejeita senha errada (401) — inclusive a antiga senha fixa "admin"', async () => {
    const errada = await supertest(app).post('/lavaRapidos/login').send({ cnpj: lavaRapido.cnpj, senha: 'errada' })
    const admin = await supertest(app).post('/lavaRapidos/login').send({ cnpj: lavaRapido.cnpj, senha: 'admin' })

    expect(errada.status).toBe(401)
    expect(admin.status).toBe(401)
  })

  it('rejeita cnpj inexistente (401)', async () => {
    const response = await supertest(app).post('/lavaRapidos/login').send({ cnpj: '99999999000199', senha: SENHA })

    expect(response.status).toBe(401)
  })
})

describe('price ("a partir de") calculado a partir dos serviços', () => {
  let comServicosId: string
  let semServicosId: string

  function dadosLavaRapido(name: string, cnpj: string) {
    return {
      name,
      cnpj,
      senha: 'hash-fake-nao-usado-nestes-testes',
      rating: 0,
      reviewsCount: 0,
      distance: '',
      time: '',
      price: 999,
      isOpen: true,
      image: 'https://placehold.co/300x300?text=Teste',
      latitude: 0,
      longitude: 0,
    }
  }

  beforeAll(async () => {
    comServicosId = (await prisma.lavaRapido.create({ data: dadosLavaRapido('Com serviços', '12121212000112') })).id
    semServicosId = (await prisma.lavaRapido.create({ data: dadosLavaRapido('Sem serviços', '13131313000113') })).id

    await prisma.servico.createMany({
      data: [
        { lavaRapidoId: comServicosId, nome: 'Barato inativo', preco: 10, ativo: false },
        { lavaRapidoId: comServicosId, nome: 'Simples', preco: 40, ativo: true },
        { lavaRapidoId: comServicosId, nome: 'Completa', preco: 70, ativo: true },
      ],
    })
  })

  afterAll(async () => {
    await prisma.lavaRapido.deleteMany({ where: { id: { in: [comServicosId, semServicosId] } } })
    await prisma.$disconnect()
  })

  it('na listagem, price é o menor preço entre os serviços ativos (ignora inativos e a coluna fixa)', async () => {
    const response = await supertest(app).get('/lavaRapidos')

    const item = response.body.find((entry: { id: string }) => entry.id === comServicosId)
    expect(item.price).toBe(40)
  })

  it('na listagem, price é null quando o lava-rápido não tem serviço ativo', async () => {
    const response = await supertest(app).get('/lavaRapidos')

    const item = response.body.find((entry: { id: string }) => entry.id === semServicosId)
    expect(item.price).toBeNull()
  })

  it('na busca por id, price segue a mesma regra', async () => {
    const [comServicos, semServicos] = await Promise.all([
      supertest(app).get(`/lavaRapidos/${comServicosId}`),
      supertest(app).get(`/lavaRapidos/${semServicosId}`),
    ])

    expect(comServicos.body.price).toBe(40)
    expect(semServicos.body.price).toBeNull()
  })
})
