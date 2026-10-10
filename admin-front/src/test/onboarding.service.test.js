import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { aceitarContrato, getSolicitacao, solicitar } from '../login/service/onboarding.service.js'
import { entrar } from '../login/service/lavaRapidos.service.js'

const CNPJ_JA_CADASTRADO = '11111111000111'
const EMAIL_JA_CADASTRADO = 'existente@exemplo.com'
const SENHA = 'senha-forte-123'
const CONTRATO = { id: 'ct-1', versao: 1, titulo: 'Termos', conteudo: 'Texto do contrato' }

// Stub mínimo do "BackEnd Onboard" + login, no mesmo estilo de lavaRapidos.service.test.js.
function startStubBackend() {
  const empresas = new Map([[CNPJ_JA_CADASTRADO, { id: 'lr-1', name: 'Existente', email: EMAIL_JA_CADASTRADO, senha: 'x' }]])
  const solicitacoes = new Map()

  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      const payload = body ? JSON.parse(body) : {}
      res.setHeader('Content-Type', 'application/json')
      const send = (status, data) => {
        res.writeHead(status)
        res.end(JSON.stringify(data))
      }

      if (req.method === 'POST' && req.url === '/onboarding/solicitacoes') {
        if (empresas.has(payload.cnpj)) return send(409, { error: 'Já existe uma empresa cadastrada com esse cnpj' })
        if ([...empresas.values()].some((empresa) => empresa.email === payload.email)) {
          return send(409, { error: 'Já existe uma empresa cadastrada com esse e-mail' })
        }
        if (typeof payload.senha !== 'string' || payload.senha.length < 8) {
          return send(400, { error: 'A senha precisa ter no mínimo 8 caracteres' })
        }
        const { senha, ...semSenha } = payload
        const solicitacao = { id: `sol-${solicitacoes.size + 1}`, ...semSenha, senha, status: 'aguardando_contrato', contrato: CONTRATO }
        solicitacoes.set(solicitacao.id, solicitacao)
        return send(201, solicitacao)
      }

      const aceiteMatch = req.url.match(/^\/onboarding\/solicitacoes\/([^/]+)\/aceite$/)
      if (req.method === 'POST' && aceiteMatch) {
        const solicitacao = solicitacoes.get(aceiteMatch[1])
        if (!solicitacao) return send(404, { error: 'Solicitação não encontrada' })
        if (payload.aceite !== 'eu aceito') return send(400, { error: 'Para assinar, envie { aceite: "eu aceito" }' })
        if (solicitacao.status === 'concluida') return send(409, { error: 'Contrato já assinado para esta solicitação' })
        solicitacao.status = 'concluida'
        const empresa = { id: 'lr-nova', name: solicitacao.name, address: solicitacao.address ?? null, email: solicitacao.email }
        empresas.set(solicitacao.cnpj, { ...empresa, senha: solicitacao.senha })
        return send(201, { token: 'token-da-nova', expiraEm: '2026-10-17T00:00:00.000Z', lavaRapido: { ...empresa, horarios: [] } })
      }

      const showMatch = req.url.match(/^\/onboarding\/solicitacoes\/([^/]+)$/)
      if (req.method === 'GET' && showMatch) {
        const solicitacao = solicitacoes.get(showMatch[1])
        if (!solicitacao) return send(404, { error: 'Solicitação não encontrada' })
        const { senha: _senha, ...publica } = solicitacao
        return send(200, publica)
      }

      if (req.method === 'POST' && req.url === '/lavaRapidos/login') {
        const empresa = empresas.get(payload.cnpj)
        if (!empresa || payload.senha !== empresa.senha) return send(401, { error: 'cnpj ou senha inválidos' })
        const { senha: _senha, ...lavaRapido } = empresa
        return send(200, { token: 'token-do-login', expiraEm: '2026-10-17T00:00:00.000Z', lavaRapido })
      }

      send(404, { error: 'not found' })
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` })
    })
  })
}

describe('onboarding.service', () => {
  let server
  let baseUrl

  beforeAll(async () => {
    ;({ server, baseUrl } = await startStubBackend())
  })

  afterAll(() => {
    server.close()
  })

  it('solicitar (com e-mail e senha) → aceitarContrato devolve a sessão, e a empresa entra com a senha escolhida', async () => {
    const solicitacao = await solicitar(
      { name: 'Lava Novo', address: 'Rua A, 1', cnpj: '22222222000122', email: 'novo@exemplo.com', senha: SENHA },
      baseUrl,
    )

    expect(solicitacao).toMatchObject({ name: 'Lava Novo', email: 'novo@exemplo.com', status: 'aguardando_contrato' })
    expect(solicitacao.contrato).toMatchObject({ titulo: 'Termos', conteudo: 'Texto do contrato', versao: 1 })

    const recarregada = await getSolicitacao(solicitacao.id, baseUrl)
    expect(recarregada.id).toBe(solicitacao.id)

    const sessao = await aceitarContrato(solicitacao.id, baseUrl)
    expect(sessao.token).toBe('token-da-nova')
    expect(sessao.empresa).toMatchObject({ id: 'lr-nova', name: 'Lava Novo', horarios: [] })
    expect(sessao.empresa.senha).toBeUndefined()

    const logada = await entrar({ cnpj: '22222222000122', senha: SENHA }, baseUrl)
    expect(logada.empresa.id).toBe('lr-nova')
    await expect(entrar({ cnpj: '22222222000122', senha: 'admin' }, baseUrl)).rejects.toThrow('CNPJ ou senha inválidos.')
  })

  it('solicitar lança erro amigável quando o cnpj já é uma empresa (409)', async () => {
    await expect(solicitar({ name: 'Dup', cnpj: CNPJ_JA_CADASTRADO, email: 'x@exemplo.com', senha: SENHA }, baseUrl)).rejects.toThrow(
      'Já existe uma empresa cadastrada com esse CNPJ.',
    )
  })

  it('solicitar lança erro amigável quando o e-mail já é de uma empresa (409)', async () => {
    await expect(
      solicitar({ name: 'Dup', cnpj: '44444444000144', email: EMAIL_JA_CADASTRADO, senha: SENHA }, baseUrl),
    ).rejects.toThrow('Já existe uma empresa cadastrada com esse e-mail.')
  })

  it('solicitar repassa a mensagem do backend para senha curta (400)', async () => {
    await expect(
      solicitar({ name: 'Curta', cnpj: '55555555000155', email: 'curta@exemplo.com', senha: '123' }, baseUrl),
    ).rejects.toThrow('A senha precisa ter no mínimo 8 caracteres')
  })

  it('aceitarContrato repetido lança o erro do backend', async () => {
    const solicitacao = await solicitar({ name: 'Outro', cnpj: '33333333000133', email: 'outro@exemplo.com', senha: SENHA }, baseUrl)
    await aceitarContrato(solicitacao.id, baseUrl)

    await expect(aceitarContrato(solicitacao.id, baseUrl)).rejects.toThrow('Contrato já assinado')
  })

  it('getSolicitacao lança erro quando a solicitação não existe', async () => {
    await expect(getSolicitacao('nao-existe', baseUrl)).rejects.toThrow('Solicitação não encontrada')
  })
})
