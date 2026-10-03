import { describe, expect, it } from 'vitest'
import { getLavaRapido, getLavaRapidos } from '../features/lava-rapidos/service/lavaRapidos.service'

describe('lavaRapidos.service', () => {
  it('getLavaRapidos busca os lava-rápidos do json-server de teste', async () => {
    const lavaRapidos = await getLavaRapidos()

    expect(lavaRapidos).toHaveLength(2)
    expect(lavaRapidos[0]).toMatchObject({
      id: '1',
      name: 'Aqua Shine Lava-Rápido',
      isOpen: true,
    })
  })

  it('getLavaRapido busca um lava-rápido específico, incluindo o endereço', async () => {
    const lavaRapido = await getLavaRapido('1')

    expect(lavaRapido).toMatchObject({
      id: '1',
      name: 'Aqua Shine Lava-Rápido',
      address: 'Rua Canhemborá, 120 - Vila Gustavo, São Paulo - SP, CEP 02253010',
    })
  })
})
