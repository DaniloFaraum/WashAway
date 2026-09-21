import { describe, expect, it } from 'vitest'
import { getLavaRapidos } from '../features/lava-rapidos/service/lavaRapidos.service'

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
})
