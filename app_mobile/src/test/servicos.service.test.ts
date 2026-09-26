import { afterEach, describe, expect, it, vi } from 'vitest'
import { getServicos } from '../features/servicos/service/servicos.service'

// Mocka `fetch` em vez de usar o json-server de teste: a versão instalada
// (json-server 1.0.0-beta.15) tem um bug que faz filtros por campos terminados
// em "Id" (ex.: `?lavaRapidoId=`) sempre retornarem vazio, mesmo com a sintaxe
// nova (`:eq=`, `_where`) — confirmado manualmente contra a lib. O backend real
// (Express) não tem esse problema; isso afeta só o fallback de teste.
describe('servicos.service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getServicos busca em /servicos?lavaRapidoId=<id> e normaliza a resposta', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 's1', lavaRapidoId: '1', nome: 'Lavagem simples', categoria: 'Lavagem', preco: 40, ativo: true },
      ],
    } as Response)

    const servicos = await getServicos('1')

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/servicos?lavaRapidoId=1'), undefined)
    expect(servicos).toEqual([
      { id: 's1', lavaRapidoId: '1', nome: 'Lavagem simples', categoria: 'Lavagem', preco: 40, ativo: true },
    ])
  })

  it('getServicos lança erro quando a resposta não é ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)

    await expect(getServicos('1')).rejects.toThrow('500')
  })
})
