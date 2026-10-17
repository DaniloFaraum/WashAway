import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLavaRapido, getLavaRapidos } from '../features/lava-rapidos/service/lavaRapidos.service'

describe('lavaRapidos.service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // O json-server de teste não implementa o filtro por horário: só a URL é conferida.
  it('getLavaRapidos(horario) manda ?horario= codificado (I9)', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => [] } as unknown as Response)

    await getLavaRapidos('2026-10-20T10:00:00-03:00')

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/lavaRapidos\?horario=2026-10-20T10%3A00%3A00-03%3A00$/)
  })

  it('getLavaRapidos sem horario não manda o parâmetro', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => [] } as unknown as Response)

    await getLavaRapidos()

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/lavaRapidos$/)
  })

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
