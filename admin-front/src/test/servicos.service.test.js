import { afterEach, describe, expect, it } from 'vitest'
import {
  atualizarServico,
  criarServico,
  getItensCatalogo,
  getServicos,
  updateServicoAtivo,
} from '../pages/servicos/service/servicos.service.js'
import { limparSessao, setEmpresaLogadaId } from '../login/sessao.storage.js'
import { TEST_SERVER_URL } from './setup/testServerConfig.js'

describe('servicos.service', () => {
  afterEach(() => {
    limparSessao()
  })

  it('getServicos busca os serviços do json-server de teste', async () => {
    const servicos = await getServicos()

    expect(servicos).toHaveLength(2)
    expect(servicos[0]).toMatchObject({ id: '1', nome: 'Lavagem simples', ativo: true })
    expect(servicos[0].itens.map((item) => item.nome)).toEqual(['Lavagem externa', 'Secagem'])
    expect(servicos[0].categorias).toEqual(['Lavagem', 'Secagem e acabamento'])
    expect(servicos[0].duracaoMinutos).toBe(30)
  })

  it('getItensCatalogo busca o catálogo de itens', async () => {
    const itens = await getItensCatalogo()

    expect(itens.length).toBeGreaterThan(0)
    expect(itens[0]).toEqual({
      id: 'i1',
      nome: 'Lavagem externa',
      descricao: 'Lavagem da carroceria',
      categoria: 'Lavagem',
      duracaoMinutos: 20,
    })
  })

  it('criarServico envia só nome, preço e itens — sem lavaRapidoId (a empresa vem do token)', async () => {
    setEmpresaLogadaId('lr-3')

    const criado = await criarServico({ nome: 'Combo teste', preco: 55, itemIds: ['i1', 'i3'] })

    expect(criado).toMatchObject({ nome: 'Combo teste', preco: 55 })
    const gravado = await (await fetch(`${TEST_SERVER_URL}/servicos/${criado.id}`)).json()
    expect(gravado).toMatchObject({ nome: 'Combo teste', preco: 55, itemIds: ['i1', 'i3'] })
    expect(gravado).not.toHaveProperty('lavaRapidoId')
  })

  it('atualizarServico envia nome, preço e itens do serviço', async () => {
    // PUT do json-server substitui o objeto inteiro (some com o lavaRapidoId) —
    // usa o '2' pra não afetar o teste de filtro por lr-1
    const atualizado = await atualizarServico('2', { nome: 'Polimento editado', preco: 130, itemIds: ['i7'] })

    expect(atualizado).toMatchObject({ id: '2', nome: 'Polimento editado', preco: 130 })
  })

  it('getServicos filtra pelo lavaRapidoId da sessão quando há uma empresa logada', async () => {
    setEmpresaLogadaId('lr-1')

    const servicos = await getServicos()

    expect(servicos).toHaveLength(1)
    expect(servicos[0]).toMatchObject({ id: '1' })
  })

  it('updateServicoAtivo atualiza o status ativo do serviço no json-server de teste', async () => {
    const servicoAtualizado = await updateServicoAtivo('2', true)

    expect(servicoAtualizado.ativo).toBe(true)

    const servicos = await getServicos()
    const servico2 = servicos.find((servico) => servico.id === '2')
    expect(servico2.ativo).toBe(true)
  })
})
