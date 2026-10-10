import { afterEach, describe, expect, it } from 'vitest'
import { getVeiculos } from '../pages/veiculos/service/veiculos.service.js'
import { limparSessao, setEmpresaLogadaId } from '../login/sessao.storage.js'

describe('veiculos.service', () => {
  afterEach(() => {
    limparSessao()
  })

  it('getVeiculos busca os veículos do json-server de teste', async () => {
    const veiculos = await getVeiculos()

    expect(veiculos).toHaveLength(2)
    expect(veiculos[0]).toMatchObject({ id: '1', modelo: 'Fiat Argo', placa: 'ABC1D23' })
  })

  it('getVeiculos não manda ?lavaRapidoId= mesmo com empresa logada (o backend filtra pelo token)', async () => {
    setEmpresaLogadaId('lr-1')

    const veiculos = await getVeiculos()

    // json-server não conhece token: sem o filtro na URL, devolve todos.
    expect(veiculos).toHaveLength(2)
  })
})
