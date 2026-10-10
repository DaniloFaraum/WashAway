import { afterEach, describe, expect, it } from 'vitest'
import {
  getIntercorrencias,
  createIntercorrencia,
} from '../pages/disponibilidade/service/disponibilidade.service.js'
import { limparSessao, setEmpresaLogadaId } from '../login/sessao.storage.js'
import { TEST_SERVER_URL } from './setup/testServerConfig.js'

describe('disponibilidade.service', () => {
  afterEach(() => {
    limparSessao()
  })

  it('getIntercorrencias busca as intercorrências do json-server de teste', async () => {
    const intercorrencias = await getIntercorrencias()

    expect(intercorrencias).toHaveLength(1)
    expect(intercorrencias[0]).toMatchObject({
      id: '1',
      data: '2026-10-12',
      motivo: 'Feriado',
      diaInteiro: true,
    })
  })

  it('getIntercorrencias filtra pelo lavaRapidoId da sessão quando há uma empresa logada', async () => {
    setEmpresaLogadaId('lr-2')

    const intercorrencias = await getIntercorrencias()

    expect(intercorrencias).toHaveLength(0)
  })

  it('createIntercorrencia cria uma intercorrência com período de horário no json-server de teste, sem lavaRapidoId (a empresa vem do token)', async () => {
    setEmpresaLogadaId('lr-1')

    const nova = await createIntercorrencia({
      data: '2026-09-25',
      motivo: 'Falta de energia',
      diaInteiro: false,
      horaInicio: '14:00',
      horaFim: '16:00',
    })

    expect(nova).toMatchObject({
      data: '2026-09-25',
      motivo: 'Falta de energia',
      diaInteiro: false,
      horaInicio: '14:00',
      horaFim: '16:00',
    })

    const gravada = await (await fetch(`${TEST_SERVER_URL}/intercorrencias/${nova.id}`)).json()
    expect(gravada).not.toHaveProperty('lavaRapidoId')
  })
})
