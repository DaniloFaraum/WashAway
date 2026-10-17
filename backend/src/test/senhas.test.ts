import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../config/prisma.js'
import {
  emailFicticioDeDev,
  gerarSenhaTemporaria,
  TAMANHO_SENHA_TEMPORARIA,
  trocarSenhasPadraoAdmin,
} from '../modules/lava-rapidos/senhas.service.js'
import { comToken, tokenDeLavaRapido } from './helpers/auth.js'
import { emailsEnfileirados, limparEmails } from './helpers/email.js'
import { criarLavaRapidoTeste, sufixoUnico } from './helpers/factories.js'
import { limparDadosDeTeste, registrarParaLimpeza } from './helpers/limpeza.js'

// i17-senha-gerada: senha temporária por e-mail, troca obrigatória, "esqueci
// minha senha" e troca em massa das empresas com a senha "admin".

const app = createApp()
const SENHA_PROPRIA = 'senha-propria-123'
const NOVA_SENHA = 'nova-senha-456'

const destinatarios = new Set<string>()
function emailUnico(prefixo: string) {
  const email = `${prefixo}-${sufixoUnico()}@teste.washaway.dev`
  destinatarios.add(email)
  return email
}

/** Senha temporária do último e-mail enfileirado para `destinatario` (o corpo traz em texto puro). */
async function senhaDoUltimoEmail(destinatario: string) {
  const emails = await emailsEnfileirados(destinatario)
  const corpo = emails.at(-1)?.corpo ?? ''
  const senha = corpo.match(/Senha temporária: (\S+)/)?.[1]
  if (!senha) throw new Error(`Nenhuma senha temporária no e-mail para ${destinatario}`)
  return senha
}

function login(cnpj: string, senha: string) {
  return supertest(app).post('/lavaRapidos/login').send({ cnpj, senha })
}

function esqueci(email: string, aplicacao = app) {
  return supertest(aplicacao).post('/auth/lava-rapido/esqueci-senha').send({ email })
}

function trocar(token: string, body: Record<string, unknown>) {
  return comToken(supertest(app).post('/auth/lava-rapido/trocar-senha'), token).send(body)
}

/** Empresa com senha própria + uma senha gerada pelo "esqueci minha senha". */
async function empresaComSenhaGerada() {
  const email = emailUnico('lava')
  const lavaRapido = await criarLavaRapidoTeste({ email, senha: SENHA_PROPRIA })
  expect((await esqueci(email)).status).toBe(200)
  return { lavaRapido, email, senhaGerada: await senhaDoUltimoEmail(email) }
}

afterAll(async () => {
  for (const destinatario of destinatarios) await limparEmails(destinatario)
  await limparDadosDeTeste()
  await prisma.$disconnect()
})

describe('gerarSenhaTemporaria', () => {
  it('gera 10 caracteres sem ambíguos, diferentes a cada chamada', () => {
    const senhas = Array.from({ length: 20 }, gerarSenhaTemporaria)

    for (const senha of senhas) {
      expect(senha).toHaveLength(TAMANHO_SENHA_TEMPORARIA)
      expect(senha).not.toMatch(/[0O1lIo]/)
    }
    expect(new Set(senhas).size).toBe(senhas.length)
  })
})

describe('POST /lavaRapidos/login com senha gerada', () => {
  it('senha própria: login normal e a senha gerada é zerada', async () => {
    const { lavaRapido, senhaGerada } = await empresaComSenhaGerada()

    const response = await login(lavaRapido.cnpj, SENHA_PROPRIA)

    expect(response.status).toBe(200)
    expect(response.body.trocaDeSenhaObrigatoria).toBe(false)
    expect(jwt.decode(response.body.token)).not.toHaveProperty('escopo')
    expect((await prisma.lavaRapido.findUnique({ where: { id: lavaRapido.id } }))?.senhaGerada).toBeNull()
    // A gerada deixou de valer.
    expect((await login(lavaRapido.cnpj, senhaGerada)).status).toBe(401)
  })

  it('senha gerada: troca obrigatória com token de escopo trocar-senha, sem expor hashes', async () => {
    const { lavaRapido, senhaGerada } = await empresaComSenhaGerada()

    const response = await login(lavaRapido.cnpj, senhaGerada)

    expect(response.status).toBe(200)
    expect(response.body.trocaDeSenhaObrigatoria).toBe(true)
    expect(response.body.lavaRapido.id).toBe(lavaRapido.id)
    expect(response.body.lavaRapido).not.toHaveProperty('senha')
    expect(response.body.lavaRapido).not.toHaveProperty('senhaGerada')
    const payload = jwt.decode(response.body.token) as jwt.JwtPayload
    expect(payload.escopo).toBe('trocar-senha')
    // Validade curta (15 min), não a do token normal.
    expect(payload.exp! - payload.iat!).toBe(15 * 60)
  })

  it('o token de troca leva 403 nas rotas de gestão', async () => {
    const { lavaRapido, senhaGerada } = await empresaComSenhaGerada()
    const { token } = (await login(lavaRapido.cnpj, senhaGerada)).body

    expect((await comToken(supertest(app).get('/pedidos'), token)).status).toBe(403)
    expect((await comToken(supertest(app).post('/servicos'), token).send({})).status).toBe(403)
    expect((await comToken(supertest(app).get('/veiculos'), token)).status).toBe(403)
  })

  it('senha errada continua 401 genérico', async () => {
    const { lavaRapido } = await empresaComSenhaGerada()

    const response = await login(lavaRapido.cnpj, 'outra-senha-qualquer')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'cnpj ou senha inválidos' })
  })

  it('nenhuma rota pública devolve a senha gerada', async () => {
    const { lavaRapido } = await empresaComSenhaGerada()

    const detalhe = await supertest(app).get(`/lavaRapidos/${lavaRapido.id}`)
    const lista = await supertest(app).get('/lavaRapidos')

    expect(detalhe.body).not.toHaveProperty('senhaGerada')
    expect(lista.body.find((item: { id: string }) => item.id === lavaRapido.id)).not.toHaveProperty('senhaGerada')
  })
})

describe('POST /auth/lava-rapido/trocar-senha', () => {
  it('com o token de troca: grava a nova senha, zera a gerada e devolve token normal', async () => {
    const { lavaRapido, senhaGerada } = await empresaComSenhaGerada()
    const { token } = (await login(lavaRapido.cnpj, senhaGerada)).body

    const response = await trocar(token, { novaSenha: NOVA_SENHA })

    expect(response.status).toBe(200)
    expect(response.body.trocaDeSenhaObrigatoria).toBe(false)
    expect(jwt.decode(response.body.token)).not.toHaveProperty('escopo')
    expect([401, 403]).not.toContain((await comToken(supertest(app).get('/pedidos'), response.body.token)).status)
    const gravado = await prisma.lavaRapido.findUnique({ where: { id: lavaRapido.id } })
    expect(gravado?.senhaGerada).toBeNull()
    expect(await bcrypt.compare(NOVA_SENHA, gravado!.senha)).toBe(true)
    // A senha antiga e a gerada deixam de valer; a nova entra normal.
    expect((await login(lavaRapido.cnpj, SENHA_PROPRIA)).status).toBe(401)
    expect((await login(lavaRapido.cnpj, senhaGerada)).status).toBe(401)
    expect((await login(lavaRapido.cnpj, NOVA_SENHA)).body.trocaDeSenhaObrigatoria).toBe(false)
  })

  it('o token de troca não serve de novo depois da troca (401)', async () => {
    const { lavaRapido, senhaGerada } = await empresaComSenhaGerada()
    const { token } = (await login(lavaRapido.cnpj, senhaGerada)).body
    expect((await trocar(token, { novaSenha: NOVA_SENHA })).status).toBe(200)

    const response = await trocar(token, { novaSenha: 'mais-uma-senha-789' })

    expect(response.status).toBe(401)
  })

  it('duas trocas simultâneas com o mesmo token de troca: uma 200 e outra 401', async () => {
    const { lavaRapido, senhaGerada } = await empresaComSenhaGerada()
    const { token } = (await login(lavaRapido.cnpj, senhaGerada)).body

    const respostas = await Promise.all([trocar(token, { novaSenha: NOVA_SENHA }), trocar(token, { novaSenha: 'outra-senha-789' })])

    expect(respostas.map((r) => r.status).sort()).toEqual([200, 401])
  })

  it('token de troca expirado → 401', async () => {
    const { lavaRapido } = await empresaComSenhaGerada()
    const expirado = jwt.sign({ sub: lavaRapido.id, tipo: 'lavaRapido', escopo: 'trocar-senha' }, process.env.JWT_SECRET!, {
      algorithm: 'HS256',
      expiresIn: -10,
    })

    expect((await trocar(expirado, { novaSenha: NOVA_SENHA })).status).toBe(401)
  })

  it('falhas repetidas → 429 (limite de tentativas)', async () => {
    const aplicacao = createApp({ limiteTentativas: { limite: 2, janelaMinutos: 15 } })
    const lavaRapido = await criarLavaRapidoTeste({ senha: SENHA_PROPRIA })
    const tentar = () =>
      comToken(supertest(aplicacao).post('/auth/lava-rapido/trocar-senha'), tokenDeLavaRapido(lavaRapido)).send({
        senhaAtual: 'errada',
        novaSenha: NOVA_SENHA,
      })

    expect((await tentar()).status).toBe(403)
    expect((await tentar()).status).toBe(403)
    expect((await tentar()).status).toBe(429)
  })

  it('recusa nova senha curta ou igual à temporária (400)', async () => {
    const { lavaRapido, senhaGerada } = await empresaComSenhaGerada()
    const { token } = (await login(lavaRapido.cnpj, senhaGerada)).body

    expect((await trocar(token, { novaSenha: '1234567' })).status).toBe(400)
    expect((await trocar(token, { novaSenha: senhaGerada })).status).toBe(400)
    expect((await prisma.lavaRapido.findUnique({ where: { id: lavaRapido.id } }))?.senhaGerada).not.toBeNull()
  })

  it('com o token normal exige a senha atual', async () => {
    const lavaRapido = await criarLavaRapidoTeste({ email: emailUnico('normal'), senha: SENHA_PROPRIA })
    const token = tokenDeLavaRapido(lavaRapido)

    expect((await trocar(token, { novaSenha: NOVA_SENHA })).status).toBe(403)
    expect((await trocar(token, { novaSenha: NOVA_SENHA, senhaAtual: 'errada-errada' })).status).toBe(403)
    const certa = await trocar(token, { novaSenha: NOVA_SENHA, senhaAtual: SENHA_PROPRIA })

    expect(certa.status).toBe(200)
    expect((await login(lavaRapido.cnpj, NOVA_SENHA)).status).toBe(200)
  })

  it('sem token → 401; token de cliente → 403', async () => {
    expect((await supertest(app).post('/auth/lava-rapido/trocar-senha').send({ novaSenha: NOVA_SENHA })).status).toBe(401)
    const tokenCliente = jwt.sign({ tipo: 'cliente' }, process.env.JWT_SECRET!, { subject: 'x', expiresIn: '1h' })
    expect((await trocar(tokenCliente, { novaSenha: NOVA_SENHA })).status).toBe(403)
  })
})

describe('POST /auth/lava-rapido/esqueci-senha', () => {
  it('e-mail cadastrado: gera senha nova (substitui a anterior) e enfileira o e-mail', async () => {
    const { lavaRapido, email, senhaGerada: primeira } = await empresaComSenhaGerada()

    const response = await esqueci(`  ${email.toUpperCase()} `)

    expect(response.status).toBe(200)
    const emails = await emailsEnfileirados(email)
    expect(emails).toHaveLength(2)
    expect(emails.at(-1)).toMatchObject({ tipo: 'esqueci_senha', status: 'pendente' })
    const segunda = await senhaDoUltimoEmail(email)
    expect(segunda).not.toBe(primeira)
    expect((await login(lavaRapido.cnpj, primeira)).status).toBe(401)
    expect((await login(lavaRapido.cnpj, segunda)).body.trocaDeSenhaObrigatoria).toBe(true)
    // A senha própria continua valendo (quem pediu pode não ser o dono).
    expect((await login(lavaRapido.cnpj, SENHA_PROPRIA)).status).toBe(200)
  })

  it('e-mail inexistente: mesma resposta e nada enfileirado', async () => {
    const existente = await empresaComSenhaGerada()
    const inexistente = emailUnico('ninguem')

    const comEmpresa = await esqueci(existente.email)
    const semEmpresa = await esqueci(inexistente)

    expect(semEmpresa.status).toBe(comEmpresa.status)
    expect(semEmpresa.body).toEqual(comEmpresa.body)
    expect(semEmpresa.body).toEqual({ mensagem: 'Se o e-mail estiver cadastrado, enviaremos uma senha temporária' })
    expect(await emailsEnfileirados(inexistente)).toHaveLength(0)
  })

  it('e-mail com formato inválido → 400', async () => {
    expect((await esqueci('nao-e-email')).status).toBe(400)
  })

  it('limite de tentativas por e-mail → 429', async () => {
    const appLimitado = createApp({ limiteEsqueciSenha: { limite: 2, janelaMinutos: 60 } })
    const email = emailUnico('limite')

    expect((await esqueci(email, appLimitado)).status).toBe(200)
    expect((await esqueci(email, appLimitado)).status).toBe(200)
    const estourou = await esqueci(email, appLimitado)

    expect(estourou.status).toBe(429)
    expect(estourou.body.error).toMatch(/Muitas tentativas/)
    // Outro e-mail tem contador próprio.
    expect((await esqueci(emailUnico('limite-outro'), appLimitado)).status).toBe(200)
  })
})

describe('aceite do onboarding', () => {
  const VERSAO_CONTRATO = 9301
  const CNPJ = '33333333000133'

  beforeAll(async () => {
    const contrato = await prisma.contrato.create({
      data: { versao: VERSAO_CONTRATO, titulo: 'Contrato de teste', conteudo: 'Termos', vigente: true },
    })
    registrarParaLimpeza('contrato', contrato.id)
  })

  afterAll(async () => {
    await prisma.solicitacaoOnboarding.deleteMany({ where: { cnpj: CNPJ } })
    await prisma.lavaRapido.deleteMany({ where: { cnpj: CNPJ } })
  })

  it('gera a senha gerada e enfileira o e-mail; as duas senhas entram', async () => {
    const email = emailUnico('onboarding')
    const solicitacao = await supertest(app)
      .post('/onboarding/solicitacoes')
      .send({ name: 'Lava Onboarding', cnpj: CNPJ, email, senha: SENHA_PROPRIA })
    expect(solicitacao.status).toBe(201)

    const aceite = await supertest(app)
      .post(`/onboarding/solicitacoes/${solicitacao.body.id}/aceite`)
      .send({ aceite: 'eu aceito' })

    expect(aceite.status).toBe(201)
    expect(aceite.body.trocaDeSenhaObrigatoria).toBe(false)
    expect(aceite.body.lavaRapido).not.toHaveProperty('senhaGerada')
    const emails = await emailsEnfileirados(email)
    expect(emails).toHaveLength(1)
    expect(emails[0]).toMatchObject({ tipo: 'senha_gerada', status: 'pendente' })
    const senhaGerada = await senhaDoUltimoEmail(email)
    expect((await login(CNPJ, senhaGerada)).body.trocaDeSenhaObrigatoria).toBe(true)
    expect((await login(CNPJ, SENHA_PROPRIA)).body.trocaDeSenhaObrigatoria).toBe(false)
  })
})

describe('troca em massa (senha "admin")', () => {
  it('invalida a "admin", gera a senha gerada e é idempotente, sem apagar dados', async () => {
    const email = emailUnico('massa')
    const comEmail = await criarLavaRapidoTeste({ email, senha: 'admin' })
    const semEmail = await criarLavaRapidoTeste({ senha: 'admin' })
    const outraSenha = await criarLavaRapidoTeste({ email: emailUnico('massa-outra'), senha: SENHA_PROPRIA })
    const ficticio = emailFicticioDeDev(semEmail.cnpj)
    destinatarios.add(ficticio)
    const filtro = { id: { in: [comEmail.id, semEmail.id, outraSenha.id] } }

    const trocadas = await trocarSenhasPadraoAdmin(filtro)

    expect(trocadas.map((item) => item.id).sort()).toEqual([comEmail.id, semEmail.id].sort())
    for (const [empresa, destinatario] of [
      [comEmail, email],
      [semEmail, ficticio],
    ] as const) {
      expect((await login(empresa.cnpj, 'admin')).status).toBe(401)
      const emails = await emailsEnfileirados(destinatario)
      expect(emails).toHaveLength(1)
      expect(emails[0].tipo).toBe('senha_gerada')
      expect((await login(empresa.cnpj, await senhaDoUltimoEmail(destinatario))).body.trocaDeSenhaObrigatoria).toBe(true)
    }
    // O e-mail fictício não é gravado na empresa; a outra empresa não é tocada.
    const semEmailDepois = await prisma.lavaRapido.findUnique({ where: { id: semEmail.id } })
    expect(semEmailDepois).toMatchObject({ email: null, name: semEmail.name })
    expect(await prisma.lavaRapido.findUnique({ where: { id: outraSenha.id } })).toMatchObject({
      senha: outraSenha.senha,
      senhaGerada: null,
    })

    // Rodar de novo não mexe em ninguém.
    expect(await trocarSenhasPadraoAdmin(filtro)).toEqual([])
    expect(await emailsEnfileirados(email)).toHaveLength(1)
    expect(await emailsEnfileirados(ficticio)).toHaveLength(1)
  })
})
