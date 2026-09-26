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

  it('getVeiculos filtra pelo lavaRapidoId da sessão quando há uma empresa logada', async () => {
    setEmpresaLogadaId('lr-1')

    const veiculos = await getVeiculos()

    expect(veiculos).toHaveLength(1)
    expect(veiculos[0]).toMatchObject({ id: '1' })
  })
})
