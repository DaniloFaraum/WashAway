import { afterEach, describe, expect, it } from 'vitest'
import { getServicos, updateServicoAtivo } from '../pages/servicos/service/servicos.service.js'
import { limparSessao, setEmpresaLogadaId } from '../login/sessao.storage.js'

describe('servicos.service', () => {
  afterEach(() => {
    limparSessao()
  })

  it('getServicos busca os serviços do json-server de teste', async () => {
    const servicos = await getServicos()

    expect(servicos).toHaveLength(2)
    expect(servicos[0]).toMatchObject({ id: '1', nome: 'Lavagem simples', ativo: true })
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
