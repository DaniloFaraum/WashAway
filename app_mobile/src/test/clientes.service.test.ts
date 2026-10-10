import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cadastrarCliente,
  EmailJaCadastradoError,
  ErroRede,
  ErroValidacao,
} from '../features/clientes/service/clientes.service'
import { MuitasTentativasError } from '../features/auth/service/auth.service'

const dados = { nome: 'Ana', email: 'ana@exemplo.com', senha: '123456' }

function resposta(status: number, corpo: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as Response
}

describe('clientes.service#cadastrarCliente', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('201: faz POST /auth/cliente/cadastro e devolve o cliente normalizado', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(resposta(201, { id: 'c1', nome: 'Ana', email: 'ana@exemplo.com', criadoEm: '2026-10-09T00:00:00Z' }))

    const cliente = await cadastrarCliente(dados)

    expect(cliente).toEqual({ id: 'c1', nome: 'Ana', email: 'ana@exemplo.com' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toEqual(expect.stringContaining('/auth/cliente/cadastro'))
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify(dados) })
  })

  it('409 vira EmailJaCadastradoError', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(409, { error: 'Este e-mail já está cadastrado' }))

    await expect(cadastrarCliente(dados)).rejects.toBeInstanceOf(EmailJaCadastradoError)
  })

  it('400 vira ErroValidacao com os campos do back-end', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(400, { error: 'x', campos: { email: 'E-mail inválido' } }))

    const erro = await cadastrarCliente(dados).catch((e) => e)

    expect(erro).toBeInstanceOf(ErroValidacao)
    expect(erro.campos).toEqual({ email: 'E-mail inválido' })
  })

  it('429 vira MuitasTentativasError com a mensagem do back-end (I17)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(429, { error: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' }))

    const erro = await cadastrarCliente(dados).catch((e) => e)

    expect(erro).toBeInstanceOf(MuitasTentativasError)
    expect(erro.message).toMatch(/Muitas tentativas/)
  })

  it('falha de rede vira ErroRede', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network request failed'))

    await expect(cadastrarCliente(dados)).rejects.toBeInstanceOf(ErroRede)
  })
})
