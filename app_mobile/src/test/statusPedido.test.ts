import { describe, expect, it } from 'vitest'
import { estiloDoStatus, STATUS_PEDIDO } from '../features/pedidos/statusPedido'

describe('statusPedido (I18)', () => {
  it('tem rótulo e cor para todos os status, incluindo aceito e recusado (I15)', () => {
    expect(Object.keys(STATUS_PEDIDO).sort()).toEqual(['aceito', 'concluido', 'em_andamento', 'pendente', 'recusado'])
    for (const estilo of Object.values(STATUS_PEDIDO)) {
      expect(estilo.rotulo).not.toBe('')
      expect(estilo.cor).toMatch(/^#/)
      expect(estilo.fundo).toMatch(/^#/)
    }
  })

  it.each([
    ['pendente', 'Aguardando confirmação'],
    ['aceito', 'Confirmado'],
    ['recusado', 'Recusado'],
    ['em_andamento', 'Em andamento'],
    ['concluido', 'Concluído'],
  ])('%s → "%s"', (status, rotulo) => {
    expect(estiloDoStatus(status).rotulo).toBe(rotulo)
  })

  it('recusado usa a cor de perigo, diferente de aceito', () => {
    expect(estiloDoStatus('recusado').cor).not.toBe(estiloDoStatus('aceito').cor)
  })

  it('status desconhecido cai num selo neutro', () => {
    expect(estiloDoStatus('cancelado').rotulo).toBe('Status desconhecido')
  })
})
