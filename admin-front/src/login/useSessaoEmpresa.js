import { useEffect, useState } from 'react'
import {
  getEmpresaLogadaId,
  getSolicitacaoOnboardingId,
  getToken,
  limparSessao,
  limparSolicitacaoOnboarding,
  setEmpresaLogadaId,
  setSolicitacaoOnboardingId,
  setToken,
} from './sessao.storage.js'
import { entrar, getLavaRapido } from './service/lavaRapidos.service.js'
import { aceitarContrato, getSolicitacao, solicitar } from './service/onboarding.service.js'
import { reabrirIntercorrencia } from './service/intercorrencias.service.js'
import { trocarSenha, TrocaDeSenhaExpiradaError } from './service/senhas.service.js'
import { definirAoExpirarSessao } from '../services/httpClient.js'

export const MENSAGEM_SESSAO_EXPIRADA = 'Sua sessão expirou. Entre de novo.'

/**
 * @returns {{
 *   empresaLogada: import('./service/lavaRapidos.model.js').LavaRapido | null,
 *   solicitacaoPendente: import('./service/onboarding.model.js').SolicitacaoOnboarding | null,
 *   loading: boolean,
 *   avisoSessao: string | null,
 *   trocaDeSenhaObrigatoria: boolean,
 *   empresaEmTrocaDeSenha: import('./service/lavaRapidos.model.js').LavaRapido | null,
 *   entrar: (credenciais: { cnpj: string, senha: string }) => Promise<void>,
 *   cadastrar: (dados: { name: string, address?: string, cnpj: string, email: string, senha: string }) => Promise<void>,
 *   aceitarContrato: () => Promise<void>,
 *   definirNovaSenha: (novaSenha: string) => Promise<void>,
 *   cancelarTrocaDeSenha: () => void,
 *   cancelarOnboarding: () => void,
 *   sair: () => void,
 *   reabrir: () => Promise<void>,
 *   recarregarEmpresa: () => Promise<void>,
 * }}
 */
export function useSessaoEmpresa() {
  const [empresaLogada, setEmpresaLogada] = useState(null)
  const [solicitacaoPendente, setSolicitacaoPendente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [avisoSessao, setAvisoSessao] = useState(null)
  // Login com a senha temporária (i17-senha-gerada): `{ token, empresa }` com o
  // token de escopo `trocar-senha`. Só em memória — recarregar volta ao Login.
  const [trocaDeSenha, setTrocaDeSenha] = useState(null)

  // 401 em qualquer chamada do painel (token ausente/expirado): volta ao Login com aviso.
  useEffect(() => {
    definirAoExpirarSessao(() => {
      limparSessao()
      setEmpresaLogada(null)
      setAvisoSessao(MENSAGEM_SESSAO_EXPIRADA)
    })
    return () => definirAoExpirarSessao(null)
  }, [])

  useEffect(() => {
    const empresaId = getEmpresaLogadaId()
    // Sessão de antes do I17 (sem token) não vale mais: precisa entrar de novo.
    if (empresaId && getToken()) {
      getLavaRapido(empresaId)
        .then(setEmpresaLogada)
        .catch(() => limparSessao())
        .finally(() => setLoading(false))
      return
    }
    if (empresaId) limparSessao()

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

  /** @param {import('./service/lavaRapidos.model.js').SessaoEmpresa} sessao */
  function abrirSessao({ token, empresa }) {
    setToken(token)
    setEmpresaLogadaId(empresa.id)
    setAvisoSessao(null)
    setEmpresaLogada(empresa)
  }

  async function handleEntrar(credenciais) {
    const sessao = await entrar(credenciais)
    if (sessao.trocaDeSenhaObrigatoria) {
      setAvisoSessao(null)
      setTrocaDeSenha({ token: sessao.token, empresa: sessao.empresa })
      return
    }
    abrirSessao(sessao)
  }

  async function definirNovaSenha(novaSenha) {
    if (!trocaDeSenha) return
    try {
      const sessao = await trocarSenha({ novaSenha, token: trocaDeSenha.token })
      setTrocaDeSenha(null)
      abrirSessao(sessao)
    } catch (error) {
      if (error instanceof TrocaDeSenhaExpiradaError) {
        setTrocaDeSenha(null)
        setAvisoSessao(error.message)
      }
      throw error
    }
  }

  function cancelarTrocaDeSenha() {
    setTrocaDeSenha(null)
  }

  async function handleCadastrar(dados) {
    const solicitacao = await solicitar(dados)
    setSolicitacaoOnboardingId(solicitacao.id)
    setSolicitacaoPendente(solicitacao)
  }

  async function handleAceitarContrato() {
    if (!solicitacaoPendente) return
    const sessao = await aceitarContrato(solicitacaoPendente.id)
    limparSolicitacaoOnboarding()
    setSolicitacaoPendente(null)
    abrirSessao(sessao)
  }

  function cancelarOnboarding() {
    limparSolicitacaoOnboarding()
    setSolicitacaoPendente(null)
  }

  function sair() {
    limparSessao()
    setAvisoSessao(null)
    setEmpresaLogada(null)
  }

  async function reabrir() {
    if (!empresaLogada?.intercorrenciaAtiva) return
    await reabrirIntercorrencia(empresaLogada.intercorrenciaAtiva.id)
    await recarregarEmpresa()
  }

  /** Busca a empresa de novo (ex.: depois de salvar o horário: isOpen/foraDoHorario/horarios mudam). */
  async function recarregarEmpresa() {
    if (!empresaLogada) return
    setEmpresaLogada(await getLavaRapido(empresaLogada.id))
  }

  return {
    empresaLogada,
    solicitacaoPendente,
    loading,
    avisoSessao,
    trocaDeSenhaObrigatoria: trocaDeSenha !== null,
    empresaEmTrocaDeSenha: trocaDeSenha?.empresa ?? null,
    entrar: handleEntrar,
    cadastrar: handleCadastrar,
    aceitarContrato: handleAceitarContrato,
    definirNovaSenha,
    cancelarTrocaDeSenha,
    cancelarOnboarding,
    sair,
    reabrir,
    recarregarEmpresa,
  }
}
