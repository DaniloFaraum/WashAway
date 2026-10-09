import { beforeEach, describe, expect, it } from 'vitest'
import {
  alternarServicoSelecionado,
  getServicosSelecionados,
  limparServicosSelecionados,
  selecionarServico,
} from '../features/servicos/servicosSelecionados'

describe('servicosSelecionados (carrinho compartilhado lista/detalhe)', () => {
  beforeEach(() => limparServicosSelecionados())

  it('alternar marca e desmarca o serviço', () => {
    alternarServicoSelecionado('lr1', 's1')
    expect([...getServicosSelecionados('lr1')]).toEqual(['s1'])
    alternarServicoSelecionado('lr1', 's1')
    expect(getServicosSelecionados('lr1').size).toBe(0)
  })

  it('selecionar (botão do detalhe) não desmarca um serviço já selecionado', () => {
    selecionarServico('lr1', 's1')
    selecionarServico('lr1', 's1')
    expect([...getServicosSelecionados('lr1')]).toEqual(['s1'])
  })

  it('a seleção é de um lava-rápido por vez', () => {
    selecionarServico('lr1', 's1')
    expect(getServicosSelecionados('lr2').size).toBe(0)
    selecionarServico('lr2', 's9')
    expect([...getServicosSelecionados('lr2')]).toEqual(['s9'])
    expect(getServicosSelecionados('lr1').size).toBe(0)
    expect(getServicosSelecionados(undefined).size).toBe(0)
  })
})
