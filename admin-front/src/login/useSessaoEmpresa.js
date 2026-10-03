import { useEffect, useState } from 'react'
import {
  getEmpresaLogadaId,
  getSolicitacaoOnboardingId,
  limparSessao,
  limparSolicitacaoOnboarding,
  setEmpresaLogadaId,
  setSolicitacaoOnboardingId,
} from './sessao.storage.js'
import { entrar, getLavaRapido } from './service/lavaRapidos.service.js'
import { aceitarContrato, getSolicitacao, solicitar } from './service/onboarding.service.js'
import { reabrirIntercorrencia } from './service/intercorrencias.service.js'

/**
 * @returns {{
 *   empresaLogada: import('./service/lavaRapidos.model.js').LavaRapido | null,
 *   solicitacaoPendente: import('./service/onboarding.model.js').SolicitacaoOnboarding | null,
 *   loading: boolean,
 *   entrar: (credenciais: { cnpj: string, senha: string }) => Promise<void>,
 *   cadastrar: (dados: { name: string, address?: string, cnpj: string }) => Promise<void>,
 *   aceitarContrato: () => Promise<void>,
 *   cancelarOnboarding: () => void,
 *   sair: () => void,
 *   reabrir: () => Promise<void>,
 * }}
 */
export function useSessaoEmpresa() {
  const [empresaLogada, setEmpresaLogada] = useState(null)
  const [solicitacaoPendente, setSolicitacaoPendente] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const empresaId = getEmpresaLogadaId()
    if (empresaId) {
      getLavaRapido(empresaId)
        .then(setEmpresaLogada)
        .catch(() => limparSessao())
        .finally(() => setLoading(false))
      return
    }

    // Retoma o onboarding de quem fechou a aba antes de assinar o contrato.
    const solicitacaoId = getSolicitacaoOnboardingId()
    if (solicitacaoId) {
      getSolicitacao(solicitacaoId)
        .then((solicitacao) => {
          if (solicitacao.status === 'aguardando_contrato') {
            setSolicitacaoPendente(solicitacao)
          } else {
            limparSolicitacaoOnboarding()
          }
        })
        .catch(() => limparSolicitacaoOnboarding())
        .finally(() => setLoading(false))
      return
    }

    setLoading(false)
  }, [])

  async function handleEntrar(credenciais) {
    const empresa = await entrar(credenciais)
    setEmpresaLogadaId(empresa.id)
    setEmpresaLogada(empresa)
  }

  async function handleCadastrar(dados) {
    const solicitacao = await solicitar(dados)
    setSolicitacaoOnboardingId(solicitacao.id)
    setSolicitacaoPendente(solicitacao)
  }

  async function handleAceitarContrato() {
    if (!solicitacaoPendente) return
    const empresa = await aceitarContrato(solicitacaoPendente.id)
    limparSolicitacaoOnboarding()
    setSolicitacaoPendente(null)
    setEmpresaLogadaId(empresa.id)
    setEmpresaLogada(empresa)
  }

  function cancelarOnboarding() {
    limparSolicitacaoOnboarding()
    setSolicitacaoPendente(null)
  }

  function sair() {
    limparSessao()
    setEmpresaLogada(null)
  }

  async function reabrir() {
    if (!empresaLogada?.intercorrenciaAtiva) return
    await reabrirIntercorrencia(empresaLogada.intercorrenciaAtiva.id)
    setEmpresaLogada(await getLavaRapido(empresaLogada.id))
  }

  return {
    empresaLogada,
    solicitacaoPendente,
    loading,
    entrar: handleEntrar,
    cadastrar: handleCadastrar,
    aceitarContrato: handleAceitarContrato,
    cancelarOnboarding,
    sair,
    reabrir,
  }
}
