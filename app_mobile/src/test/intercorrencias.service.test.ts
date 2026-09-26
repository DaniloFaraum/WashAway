import { afterEach, describe, expect, it, vi } from 'vitest'
import { getIntercorrencias } from '../features/intercorrencias/service/intercorrencias.service'

// Ver comentário em servicos.service.test.ts: mocka `fetch` por causa do bug
// do json-server 1.0.0-beta.15 com filtros em campos terminados em "Id".
describe('intercorrencias.service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getIntercorrencias busca em /intercorrencias?lavaRapidoId=<id> e normaliza a resposta', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'i1',
          lavaRapidoId: '1',
          data: '2026-10-12',
          motivo: 'Feriado',
          diaInteiro: true,
          horaInicio: null,
          horaFim: null,
        },
      ],
    } as Response)

    const intercorrencias = await getIntercorrencias('1')

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/intercorrencias?lavaRapidoId=1'), undefined)
    expect(intercorrencias).toEqual([
      {
        id: 'i1',
        lavaRapidoId: '1',
        data: '2026-10-12',
        motivo: 'Feriado',
        diaInteiro: true,
        horaInicio: null,
        horaFim: null,
      },
    ])
  })

  it('getIntercorrencias lança erro quando a resposta não é ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)

    await expect(getIntercorrencias('1')).rejects.toThrow('500')
  })
})
