import { useEffect, useState } from 'react'
import { getEmpresaLogadaId, limparSessao, setEmpresaLogadaId } from './sessao.storage.js'
import { cadastrar, entrar, getLavaRapido } from './service/lavaRapidos.service.js'

/**
 * @returns {{
 *   empresaLogada: import('./service/lavaRapidos.model.js').LavaRapido | null,
 *   loading: boolean,
 *   entrar: (credenciais: { cnpj: string, senha: string }) => Promise<void>,
 *   cadastrar: (dados: { name: string, address?: string, cnpj: string }) => Promise<void>,
 *   sair: () => void,
 * }}
 */
export function useSessaoEmpresa() {
  const [empresaLogada, setEmpresaLogada] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = getEmpresaLogadaId()
    if (!id) {
      setLoading(false)
      return
    }

    getLavaRapido(id)
      .then(setEmpresaLogada)
      .catch(() => limparSessao())
      .finally(() => setLoading(false))
  }, [])

  async function handleEntrar(credenciais) {
    const empresa = await entrar(credenciais)
    setEmpresaLogadaId(empresa.id)
    setEmpresaLogada(empresa)
  }

  async function handleCadastrar(dados) {
    const empresa = await cadastrar(dados)
    setEmpresaLogadaId(empresa.id)
    setEmpresaLogada(empresa)
  }

  function sair() {
    limparSessao()
    setEmpresaLogada(null)
  }

  return { empresaLogada, loading, entrar: handleEntrar, cadastrar: handleCadastrar, sair }
}
