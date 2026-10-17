import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import { comToken, tokenDeCliente, tokenDeInterno, tokenDeLavaRapido } from './helpers/auth.js'
import { emailsEnfileirados, limparEmails } from './helpers/email.js'
import {
  criarClienteTeste,
  criarLavaRapidoTeste,
  criarServicoTeste,
  criarUsuarioInternoTeste,
  sufixoUnico,
} from './helpers/factories.js'
import { limparDadosDeTeste, registrarParaLimpeza } from './helpers/limpeza.js'

// i17-interno-exclusao: a empresa só SOLICITA a exclusão (vê e cancela a
// pendente); quem exclui é um interno com permissão `admin`, ao aprovar.
// Cada etapa (solicitada, aprovada, recusada) enfileira um e-mail.

const app = createApp()

const ROTA_EMPRESA = '/lavaRapidos/me/solicitacao-exclusao'
const ROTA_INTERNA = '/interno/solicitacoes-exclusao'

const emailsUsados: string[] = []

async function empresaComEmail() {
  const email = `empresa-${sufixoUnico()}@teste.washaway.dev`
  emailsUsados.push(email)
  const empresa = await criarLavaRapidoTeste({ email })
  return { empresa, email, token: tokenDeLavaRapido(empresa) }
}

/** Solicita pela API e registra a solicitação para limpeza. */
async function solicitar(token: string, body: Record<string, unknown> = {}) {
  const response = await comToken(supertest(app).post(ROTA_EMPRESA), token).send(body)
  if (response.body?.id) registrarParaLimpeza('solicitacaoExclusao', response.body.id)
  return response
}

let admin: { id: string }
let tokenAdmin: string

beforeAll(async () => {
  admin = await criarUsuarioInternoTeste({ permissoes: ['admin'] })
  tokenAdmin = tokenDeInterno(['admin'], admin)
})

afterAll(async () => {
  for (const email of emailsUsados) await limparEmails(email)
  await limparDadosDeTeste()
  await prisma.$disconnect()
})

describe('autenticação (401) × permissão (403)', () => {
  const rotasInternas = [
    { metodo: 'get', caminho: ROTA_INTERNA },
    { metodo: 'post', caminho: `${ROTA_INTERNA}/qualquer/aprovar` },
    { metodo: 'post', caminho: `${ROTA_INTERNA}/qualquer/recusar` },
  ] as const

  it.each(rotasInternas)('$metodo $caminho sem token: 401', async ({ metodo, caminho }) => {
    const response = await supertest(app)[metodo](caminho)

    expect(response.status).toBe(401)
  })

  it.each(rotasInternas)('$metodo $caminho com token de lava-rápido ou cliente: 403', async ({ metodo, caminho }) => {
    const lavaRapido = await comToken(supertest(app)[metodo](caminho), tokenDeLavaRapido({ id: 'lr-qualquer' }))
    const cliente = await comToken(supertest(app)[metodo](caminho), tokenDeCliente({ id: 'c-qualquer' }))

    expect(lavaRapido.status).toBe(403)
    expect(cliente.status).toBe(403)
  })

  it.each(rotasInternas)('$metodo $caminho com interno sem admin: 403', async ({ metodo, caminho }) => {
    const response = await comToken(supertest(app)[metodo](caminho), tokenDeInterno(['suporte'], admin))

    expect(response.status).toBe(403)
  })

  it('rotas da empresa: sem token 401; token de cliente ou de interno 403', async () => {
    const cliente = await criarClienteTeste()
    for (const metodo of ['get', 'post', 'delete'] as const) {
      expect((await supertest(app)[metodo](ROTA_EMPRESA)).status).toBe(401)
      expect((await comToken(supertest(app)[metodo](ROTA_EMPRESA), tokenDeCliente(cliente))).status).toBe(403)
      expect((await comToken(supertest(app)[metodo](ROTA_EMPRESA), tokenAdmin)).status).toBe(403)
    }
  })

  it('DELETE /lavaRapidos/:id e POST /lavaRapidos não existem (404)', async () => {
    const { empresa, token } = await empresaComEmail()

    const deletar = await comToken(supertest(app).delete(`/lavaRapidos/${empresa.id}`), tokenAdmin)
    const deletarDaPropria = await comToken(supertest(app).delete(`/lavaRapidos/${empresa.id}`), token)
    const criar = await supertest(app).post('/lavaRapidos').send({ name: 'Legado', cnpj: '12345678000199' })

    expect(deletar.status).toBe(404)
    expect(deletarDaPropria.status).toBe(404)
    expect(criar.status).toBe(404)
    expect(await prisma.lavaRapido.count({ where: { id: empresa.id } })).toBe(1)
  })
})

describe('empresa: solicitar, ver e cancelar', () => {
  it('sem solicitação: GET 404', async () => {
    const { token } = await empresaComEmail()

    const response = await comToken(supertest(app).get(ROTA_EMPRESA), token)

    expect(response.status).toBe(404)
  })

  it('solicita (201, com snapshot e e-mail); a segunda devolve a mesma (200)', async () => {
    const { empresa, email, token } = await empresaComEmail()

    const primeira = await solicitar(token, { motivo: '  Vou fechar a loja  ' })
    const segunda = await solicitar(token, { motivo: 'outro motivo' })

    expect(primeira.status).toBe(201)
    expect(primeira.body).toMatchObject({
      lavaRapidoId: empresa.id,
      nome: empresa.name,
      cnpj: empresa.cnpj,
      email,
      motivo: 'Vou fechar a loja',
      status: 'pendente',
      decididoEm: null,
      decididoPorId: null,
    })
    expect(segunda.status).toBe(200)
    expect(segunda.body.id).toBe(primeira.body.id)
    expect(segunda.body.motivo).toBe('Vou fechar a loja')

    const emails = await emailsEnfileirados(email)
    expect(emails.map((e) => e.tipo)).toEqual(['exclusao_solicitada'])
    expect(emails[0].corpo).toContain('Vou fechar a loja')

    const ver = await comToken(supertest(app).get(ROTA_EMPRESA), token)
    expect(ver.status).toBe(200)
    expect(ver.body.id).toBe(primeira.body.id)
  })

  it('duas solicitações simultâneas criam uma pendente só', async () => {
    const { empresa, token } = await empresaComEmail()

    const respostas = await Promise.all([solicitar(token), solicitar(token), solicitar(token)])

    expect(new Set(respostas.map((r) => r.body.id)).size).toBe(1)
    expect(respostas.filter((r) => r.status === 201)).toHaveLength(1)
    expect(await prisma.solicitacaoExclusao.count({ where: { lavaRapidoId: empresa.id, status: 'pendente' } })).toBe(1)
  })

  it('motivo que não é texto ou longo demais: 400', async () => {
    const { token } = await empresaComEmail()

    expect((await solicitar(token, { motivo: 123 })).status).toBe(400)
    expect((await solicitar(token, { motivo: 'x'.repeat(501) })).status).toBe(400)
  })

  it('cancela a pendente; depois GET mostra cancelada, DELETE de novo 404, e pode solicitar outra', async () => {
    const { empresa, email, token } = await empresaComEmail()
    const solicitada = await solicitar(token)

    const cancelada = await comToken(supertest(app).delete(ROTA_EMPRESA), token)
    const ver = await comToken(supertest(app).get(ROTA_EMPRESA), token)
    const cancelarDeNovo = await comToken(supertest(app).delete(ROTA_EMPRESA), token)
    const nova = await solicitar(token)

    expect(cancelada.status).toBe(200)
    expect(cancelada.body).toMatchObject({ id: solicitada.body.id, status: 'cancelada' })
    expect(ver.body).toMatchObject({ id: solicitada.body.id, status: 'cancelada' })
    expect(cancelarDeNovo.status).toBe(404)
    expect(nova.status).toBe(201)
    expect(nova.body.id).not.toBe(solicitada.body.id)
    expect(await prisma.lavaRapido.count({ where: { id: empresa.id } })).toBe(1)
    // Cancelar não gera e-mail (só solicitada/aprovada/recusada).
    expect((await emailsEnfileirados(email)).map((e) => e.tipo)).toEqual(['exclusao_solicitada', 'exclusao_solicitada'])
  })

  it('empresa sem e-mail (anterior ao I17) também solicita', async () => {
    const empresa = await criarLavaRapidoTeste()

    const response = await solicitar(tokenDeLavaRapido(empresa))

    expect(response.status).toBe(201)
    expect(response.body.email).toBeNull()
  })

  it('token de empresa que não existe mais: 401', async () => {
    const response = await solicitar(tokenDeLavaRapido({ id: `inexistente-${sufixoUnico()}` }))

    expect(response.status).toBe(401)
  })
})

describe('interno admin: listar, aprovar e recusar', () => {
  it('lista por status; status inválido 400', async () => {
    const { token } = await empresaComEmail()
    const solicitada = await solicitar(token)

    const pendentes = await comToken(supertest(app).get(`${ROTA_INTERNA}?status=pendente`), tokenAdmin)
    const invalido = await comToken(supertest(app).get(`${ROTA_INTERNA}?status=qualquer`), tokenAdmin)

    expect(pendentes.status).toBe(200)
    expect(pendentes.body.map((s: { id: string }) => s.id)).toContain(solicitada.body.id)
    expect(pendentes.body.every((s: { status: string }) => s.status === 'pendente')).toBe(true)
    expect(invalido.status).toBe(400)
  })

  it('aprovar exclui a empresa e os dados dela; o registro sobrevive com o snapshot', async () => {
    const { empresa, email, token } = await empresaComEmail()
    const servico = await criarServicoTeste(empresa.id)
    await prisma.intercorrencia.create({ data: { lavaRapidoId: empresa.id, data: '2026-12-01', motivo: 'Feriado' } })
    await prisma.horarioFuncionamento.create({ data: { lavaRapidoId: empresa.id, diaSemana: 1, abertura: '08:00', fechamento: '18:00' } })
    const solicitada = await solicitar(token, { motivo: 'Encerrando' })

    const aprovada = await comToken(supertest(app).post(`${ROTA_INTERNA}/${solicitada.body.id}/aprovar`), tokenAdmin)

    expect(aprovada.status).toBe(200)
    expect(aprovada.body).toMatchObject({
      id: solicitada.body.id,
      status: 'aprovada',
      lavaRapidoId: null,
      nome: empresa.name,
      cnpj: empresa.cnpj,
      email,
      motivo: 'Encerrando',
      decididoPorId: admin.id,
    })
    expect(aprovada.body.decididoEm).not.toBeNull()
    expect(await prisma.lavaRapido.count({ where: { id: empresa.id } })).toBe(0)
    expect(await prisma.servico.count({ where: { id: servico.id } })).toBe(0)
    expect(await prisma.intercorrencia.count({ where: { lavaRapidoId: empresa.id } })).toBe(0)
    expect(await prisma.horarioFuncionamento.count({ where: { lavaRapidoId: empresa.id } })).toBe(0)
    expect(await prisma.solicitacaoExclusao.count({ where: { id: solicitada.body.id } })).toBe(1)
    expect((await emailsEnfileirados(email)).map((e) => e.tipo)).toEqual(['exclusao_solicitada', 'exclusao_aprovada'])

    // Decidir de novo: 409. O token da empresa excluída não vale mais.
    const deNovo = await comToken(supertest(app).post(`${ROTA_INTERNA}/${solicitada.body.id}/recusar`), tokenAdmin)
    expect(deNovo.status).toBe(409)
    expect((await solicitar(token)).status).toBe(401)
  })

  it('recusar grava a observação, enfileira o e-mail e a empresa continua', async () => {
    const { empresa, email, token } = await empresaComEmail()
    const solicitada = await solicitar(token)

    const recusada = await comToken(supertest(app).post(`${ROTA_INTERNA}/${solicitada.body.id}/recusar`), tokenAdmin).send({
      observacao: 'Há pedidos em aberto',
    })

    expect(recusada.status).toBe(200)
    expect(recusada.body).toMatchObject({ status: 'recusada', observacao: 'Há pedidos em aberto', decididoPorId: admin.id, lavaRapidoId: empresa.id })
    expect(await prisma.lavaRapido.count({ where: { id: empresa.id } })).toBe(1)
    const emails = await emailsEnfileirados(email)
    expect(emails.map((e) => e.tipo)).toEqual(['exclusao_solicitada', 'exclusao_recusada'])
    expect(emails[1].corpo).toContain('Há pedidos em aberto')

    // A empresa vê a recusa; aprovar depois de recusada: 409; pode solicitar de novo.
    const ver = await comToken(supertest(app).get(ROTA_EMPRESA), token)
    expect(ver.body).toMatchObject({ id: solicitada.body.id, status: 'recusada' })
    expect((await comToken(supertest(app).post(`${ROTA_INTERNA}/${solicitada.body.id}/aprovar`), tokenAdmin)).status).toBe(409)
    expect(await prisma.lavaRapido.count({ where: { id: empresa.id } })).toBe(1)
    expect((await solicitar(token)).status).toBe(201)
  })

  it('não dá pra aprovar uma cancelada (409)', async () => {
    const { empresa, token } = await empresaComEmail()
    const solicitada = await solicitar(token)
    await comToken(supertest(app).delete(ROTA_EMPRESA), token)

    const response = await comToken(supertest(app).post(`${ROTA_INTERNA}/${solicitada.body.id}/aprovar`), tokenAdmin)

    expect(response.status).toBe(409)
    expect(await prisma.lavaRapido.count({ where: { id: empresa.id } })).toBe(1)
  })

  it('solicitação inexistente: 404; observação inválida: 400', async () => {
    const { token } = await empresaComEmail()
    const solicitada = await solicitar(token)

    const inexistente = await comToken(supertest(app).post(`${ROTA_INTERNA}/nao-existe/aprovar`), tokenAdmin)
    const observacaoInvalida = await comToken(supertest(app).post(`${ROTA_INTERNA}/${solicitada.body.id}/recusar`), tokenAdmin).send({
      observacao: ['x'],
    })

    expect(inexistente.status).toBe(404)
    expect(observacaoInvalida.status).toBe(400)
  })

  it('token de interno que não existe mais: 401 e nada muda', async () => {
    const { empresa, token } = await empresaComEmail()
    const solicitada = await solicitar(token)

    const response = await comToken(
      supertest(app).post(`${ROTA_INTERNA}/${solicitada.body.id}/aprovar`),
      tokenDeInterno(['admin'], { id: `interno-removido-${sufixoUnico()}` }),
    )

    expect(response.status).toBe(401)
    expect(await prisma.lavaRapido.count({ where: { id: empresa.id } })).toBe(1)
  })
})
