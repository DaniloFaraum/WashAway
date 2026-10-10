import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { getVeiculoDoCliente } from '../modules/veiculos-cliente/veiculosCliente.service.js'
import { comToken, tokenDeCliente, tokenDeLavaRapido } from './helpers/auth.js'
import { criarClienteTeste, criarVeiculoTeste, placaUnica } from './helpers/factories.js'
import { limparDadosDeTeste, registrarParaLimpeza } from './helpers/limpeza.js'

const app = createApp()
const ROTA = '/clientes/me/veiculos'

type ClienteTeste = Awaited<ReturnType<typeof criarClienteTeste>>
let cliente: ClienteTeste
let outroCliente: ClienteTeste
let token: string

beforeAll(async () => {
  cliente = await criarClienteTeste()
  outroCliente = await criarClienteTeste()
  token = tokenDeCliente(cliente)
})

afterAll(async () => {
  await limparDadosDeTeste()
  await prisma.$disconnect()
})

async function criarViaApi(body: Record<string, unknown>, tokenUsado = token) {
  const response = await comToken(supertest(app).post(ROTA), tokenUsado).send(body)
  if (response.status === 201) registrarParaLimpeza('veiculo', response.body.id)
  return response
}

/** Placa Mercosul única com hífen e em minúsculas, pra conferir a normalização. */
function placaBaguncada() {
  const placa = placaUnica()
  return { enviada: `${placa.slice(0, 3)}-${placa.slice(3)}`.toLowerCase(), salva: placa }
}

describe('POST /clientes/me/veiculos', () => {
  it('cria com placa antiga: abc-1234 é salva como ABC1234', async () => {
    // Cliente próprio do teste: a placa fixa não colide com outra execução.
    const dono = await criarClienteTeste()
    const response = await criarViaApi({ marca: ' Chevrolet ', modelo: 'Onix', cor: 'Prata', placa: 'abc-1234' }, tokenDeCliente(dono))

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ clienteId: dono.id, marca: 'Chevrolet', modelo: 'Onix', cor: 'Prata', placa: 'ABC1234' })
  })

  it('cria com placa Mercosul: abc1d23 vira ABC1D23, sem marca (null)', async () => {
    const dono = await criarClienteTeste()
    const response = await criarViaApi({ modelo: 'HB20', cor: 'Branco', placa: 'abc1d23' }, tokenDeCliente(dono))

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ placa: 'ABC1D23', marca: null })
  })

  it.each(['AB12345', 'ABCD123'])('placa inválida (%s): 400', async (placa) => {
    const response = await criarViaApi({ modelo: 'Onix', cor: 'Prata', placa })

    expect(response.status).toBe(400)
    expect(response.body.campos).toHaveProperty('placa')
  })

  it('campo obrigatório faltando: 400 com os campos', async () => {
    const response = await criarViaApi({ marca: 'Fiat' })

    expect(response.status).toBe(400)
    expect(Object.keys(response.body.campos).sort()).toEqual(['cor', 'modelo', 'placa'])
  })

  it('placa duplicada no mesmo cliente (mesmo com outra formatação): 409', async () => {
    const { enviada, salva } = placaBaguncada()
    expect((await criarViaApi({ modelo: 'Onix', cor: 'Prata', placa: salva })).status).toBe(201)

    const response = await criarViaApi({ modelo: 'Outro', cor: 'Preto', placa: enviada })

    expect(response.status).toBe(409)
    expect(response.body.error).toEqual(expect.any(String))
  })

  it('a mesma placa em outro cliente é permitida', async () => {
    const { salva } = placaBaguncada()
    expect((await criarViaApi({ modelo: 'Onix', cor: 'Prata', placa: salva })).status).toBe(201)

    const response = await criarViaApi({ modelo: 'Onix', cor: 'Prata', placa: salva }, tokenDeCliente(outroCliente))

    expect(response.status).toBe(201)
    expect(response.body.clienteId).toBe(outroCliente.id)
  })
})

describe('GET /clientes/me/veiculos', () => {
  it('lista só os veículos do próprio cliente', async () => {
    const dono = await criarClienteTeste()
    const meu = await criarVeiculoTeste(dono.id)
    await criarVeiculoTeste(outroCliente.id)

    const response = await comToken(supertest(app).get(ROTA), tokenDeCliente(dono))

    expect(response.status).toBe(200)
    expect(response.body.map((v: { id: string }) => v.id)).toEqual([meu.id])
  })
})

describe('PUT /clientes/me/veiculos/:id', () => {
  it('atualiza o próprio veículo (normalizando a placa)', async () => {
    const veiculo = await criarVeiculoTeste(cliente.id)
    const { enviada, salva } = placaBaguncada()

    const response = await comToken(supertest(app).put(`${ROTA}/${veiculo.id}`), token).send({
      marca: '',
      modelo: 'Corolla',
      cor: 'Preto',
      placa: enviada,
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: veiculo.id, marca: null, modelo: 'Corolla', cor: 'Preto', placa: salva })
  })

  it('placa inválida: 400', async () => {
    const veiculo = await criarVeiculoTeste(cliente.id)

    const response = await comToken(supertest(app).put(`${ROTA}/${veiculo.id}`), token).send({ modelo: 'X', cor: 'Y', placa: 'ABCD123' })

    expect(response.status).toBe(400)
  })

  it('trocar para a placa de outro veículo do mesmo cliente: 409', async () => {
    const a = await criarVeiculoTeste(cliente.id)
    const b = await criarVeiculoTeste(cliente.id)

    const response = await comToken(supertest(app).put(`${ROTA}/${b.id}`), token).send({ modelo: 'X', cor: 'Y', placa: a.placa })

    expect(response.status).toBe(409)
  })
})

describe('DELETE /clientes/me/veiculos/:id', () => {
  it('remove o próprio veículo: 204', async () => {
    const veiculo = await criarVeiculoTeste(cliente.id)

    const response = await comToken(supertest(app).delete(`${ROTA}/${veiculo.id}`), token)

    expect(response.status).toBe(204)
    expect(await prisma.veiculo.findUnique({ where: { id: veiculo.id } })).toBeNull()
  })

  it('id inexistente: 404', async () => {
    const response = await comToken(supertest(app).delete(`${ROTA}/nao-existe`), token)

    expect(response.status).toBe(404)
  })
})

describe('Acesso ao veículo de outro cliente: 404 (nunca 403)', () => {
  it('GET: o veículo do outro não aparece na lista; getVeiculoDoCliente devolve null', async () => {
    const doOutro = await criarVeiculoTeste(outroCliente.id)

    const response = await comToken(supertest(app).get(ROTA), token)

    expect(response.status).toBe(200)
    expect(response.body.map((v: { id: string }) => v.id)).not.toContain(doOutro.id)
    expect(await getVeiculoDoCliente(cliente.id, doOutro.id)).toBeNull()
    expect(await getVeiculoDoCliente(outroCliente.id, doOutro.id)).toMatchObject({ id: doOutro.id })
  })

  it('PUT: 404 e o veículo não muda', async () => {
    const doOutro = await criarVeiculoTeste(outroCliente.id)

    const response = await comToken(supertest(app).put(`${ROTA}/${doOutro.id}`), token).send({ modelo: 'Hackeado', cor: 'Y', placa: 'ABC1234' })

    expect(response.status).toBe(404)
    expect(await prisma.veiculo.findUnique({ where: { id: doOutro.id } })).toMatchObject({ modelo: doOutro.modelo })
  })

  it('DELETE: 404 e o veículo continua existindo', async () => {
    const doOutro = await criarVeiculoTeste(outroCliente.id)

    const response = await comToken(supertest(app).delete(`${ROTA}/${doOutro.id}`), token)

    expect(response.status).toBe(404)
    expect(await prisma.veiculo.findUnique({ where: { id: doOutro.id } })).not.toBeNull()
  })
})

describe('O dono vem sempre do token (clienteId do body é ignorado)', () => {
  it('POST com clienteId de outro cliente: o veículo fica com o cliente do token', async () => {
    const response = await criarViaApi({ modelo: 'Onix', cor: 'Prata', placa: placaUnica(), clienteId: outroCliente.id })

    expect(response.status).toBe(201)
    expect(response.body.clienteId).toBe(cliente.id)
  })

  it('PUT com clienteId de outro cliente: o veículo não troca de dono', async () => {
    const veiculo = await criarVeiculoTeste(cliente.id)

    const response = await comToken(supertest(app).put(`${ROTA}/${veiculo.id}`), token).send({
      modelo: 'Onix',
      cor: 'Prata',
      placa: veiculo.placa,
      clienteId: outroCliente.id,
    })

    expect(response.status).toBe(200)
    expect(response.body.clienteId).toBe(cliente.id)
    expect(await prisma.veiculo.findUnique({ where: { id: veiculo.id } })).toMatchObject({ clienteId: cliente.id })
  })
})

describe('Token de lava-rápido (painel): 403', () => {
  it.each([
    ['GET', () => supertest(app).get(ROTA)],
    ['POST', () => supertest(app).post(ROTA)],
    ['PUT', () => supertest(app).put(`${ROTA}/qualquer`)],
    ['DELETE', () => supertest(app).delete(`${ROTA}/qualquer`)],
  ])('%s', async (_metodo, requisicao) => {
    const response = await comToken(requisicao(), tokenDeLavaRapido({ id: 'lava-rapido-qualquer' }))

    expect(response.status).toBe(403)
  })
})

describe('Sem token: 401', () => {
  it.each([
    ['GET', () => supertest(app).get(ROTA)],
    ['POST', () => supertest(app).post(ROTA).send({ modelo: 'Onix', cor: 'Prata', placa: 'ABC1234' })],
    ['PUT', () => supertest(app).put(`${ROTA}/qualquer`).send({})],
    ['DELETE', () => supertest(app).delete(`${ROTA}/qualquer`)],
  ])('%s', async (_metodo, requisicao) => {
    const response = await requisicao()

    expect(response.status).toBe(401)
  })
})
