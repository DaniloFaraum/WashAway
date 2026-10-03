import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { aceitarContrato, getSolicitacao, solicitar } from '../login/service/onboarding.service.js'
import { entrar } from '../login/service/lavaRapidos.service.js'

const CNPJ_JA_CADASTRADO = '11111111000111'
const CONTRATO = { id: 'ct-1', versao: 1, titulo: 'Termos', conteudo: 'Texto do contrato' }

// Stub mínimo do "BackEnd Onboard" + login, no mesmo estilo de lavaRapidos.service.test.js.
function startStubBackend() {
  const empresas = new Map([[CNPJ_JA_CADASTRADO, { id: 'lr-1', name: 'Existente' }]])
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
        const solicitacao = { id: `sol-${solicitacoes.size + 1}`, ...payload, status: 'aguardando_contrato', contrato: CONTRATO }
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
        const empresa = { id: 'lr-nova', name: solicitacao.name, address: solicitacao.address ?? null }
        empresas.set(solicitacao.cnpj, empresa)
        return send(201, { ...empresa, senha: 'hash-nao-deveria-vazar' })
      }

      const showMatch = req.url.match(/^\/onboarding\/solicitacoes\/([^/]+)$/)
      if (req.method === 'GET' && showMatch) {
        const solicitacao = solicitacoes.get(showMatch[1])
        return solicitacao ? send(200, solicitacao) : send(404, { error: 'Solicitação não encontrada' })
      }

      if (req.method === 'POST' && req.url === '/lavaRapidos/login') {
        const empresa = empresas.get(payload.cnpj)
        return empresa && payload.senha === 'admin' ? send(200, empresa) : send(401, { error: 'cnpj ou senha inválidos' })
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

  it('solicitar → aceitarContrato cria a empresa, que passa a conseguir entrar com a senha padrão', async () => {
    const solicitacao = await solicitar({ name: 'Lava Novo', address: 'Rua A, 1', cnpj: '22222222000122' }, baseUrl)

    expect(solicitacao).toMatchObject({ name: 'Lava Novo', status: 'aguardando_contrato' })
    expect(solicitacao.contrato).toMatchObject({ titulo: 'Termos', conteudo: 'Texto do contrato', versao: 1 })

    const recarregada = await getSolicitacao(solicitacao.id, baseUrl)
    expect(recarregada.id).toBe(solicitacao.id)

    const empresa = await aceitarContrato(solicitacao.id, baseUrl)
    expect(empresa).toMatchObject({ id: 'lr-nova', name: 'Lava Novo' })
    expect(empresa.senha).toBeUndefined()

    const logada = await entrar({ cnpj: '22222222000122', senha: 'admin' }, baseUrl)
    expect(logada.id).toBe('lr-nova')
  })

  it('solicitar lança erro amigável quando o cnpj já é uma empresa (409)', async () => {
    await expect(solicitar({ name: 'Dup', cnpj: CNPJ_JA_CADASTRADO }, baseUrl)).rejects.toThrow(
      'Já existe uma empresa cadastrada com esse CNPJ.',
    )
  })

  it('aceitarContrato repetido lança o erro do backend', async () => {
    const solicitacao = await solicitar({ name: 'Outro', cnpj: '33333333000133' }, baseUrl)
    await aceitarContrato(solicitacao.id, baseUrl)

    await expect(aceitarContrato(solicitacao.id, baseUrl)).rejects.toThrow('Contrato já assinado')
  })

  it('getSolicitacao lança erro quando a solicitação não existe', async () => {
    await expect(getSolicitacao('nao-existe', baseUrl)).rejects.toThrow('Solicitação não encontrada')
  })
})
