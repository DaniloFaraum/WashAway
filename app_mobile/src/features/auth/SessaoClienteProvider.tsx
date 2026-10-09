import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { Cliente } from '@/features/clientes/service/clientes.model'
import { definirTokenDaSessao, registrarAoExpirarSessao } from '@/services/httpClient'
import { entrar as entrarNaApi, me } from './service/auth.service'
import * as tokenStorage from './tokenStorage'

// Sessão do cliente (I2). Guarda o token no armazenamento seguro (tokenStorage),
// repassa pro httpClient e valida no boot com GET /clientes/me. A navegação
// (login ↔ Home) fica no gate de `src/app/_layout.tsx`, que olha `token`.

export interface SessaoCliente {
  /** Cliente logado; pode ser `null` com token válido se o boot ficou sem rede. */
  cliente: Cliente | null
  token: string | null
  /** Lendo o token salvo / validando no boot. */
  carregando: boolean
  /** A última sessão terminou por 401 (token expirado/inválido), não por "Sair". */
  expirada: boolean
  entrar: (email: string, senha: string) => Promise<Cliente>
  sair: () => Promise<void>
}

const SessaoClienteContext = createContext<SessaoCliente | null>(null)

export function SessaoClienteProvider({ children }: { children: ReactNode }) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [expirada, setExpirada] = useState(false)

  const encerrar = useCallback(async (motivoExpirada: boolean) => {
    definirTokenDaSessao(null)
    setToken(null)
    setCliente(null)
    setExpirada(motivoExpirada)
    try {
      await tokenStorage.limparToken()
    } catch {
      // Sem como apagar do aparelho: a sessão em memória já acabou; o token
      // salvo será recusado (401) e limpo de novo na próxima abertura.
    }
  }, [])

  // 401 com token em qualquer tela → sessão expirada.
  useEffect(() => registrarAoExpirarSessao(() => void encerrar(true)), [encerrar])

  // Boot: token salvo → valida com GET /clientes/me.
  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const salvo = await tokenStorage.getToken()
        if (!salvo || !ativo) return
        definirTokenDaSessao(salvo)
        setToken(salvo)
        try {
          const dados = await me()
          if (ativo) setCliente(dados)
        } catch {
          // 401: o handler acima já encerrou a sessão. Sem rede: mantém o token
          // (a próxima chamada autenticada confirma ou derruba a sessão).
        }
      } catch {
        // Não deu pra ler o armazenamento: segue sem sessão.
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  const entrar = useCallback(async (email: string, senha: string) => {
    const login = await entrarNaApi(email, senha)
    await tokenStorage.setToken(login.token)
    definirTokenDaSessao(login.token)
    setToken(login.token)
    setCliente(login.cliente)
    setExpirada(false)
    return login.cliente
  }, [])

  const sair = useCallback(() => encerrar(false), [encerrar])

  const valor = useMemo(
    () => ({ cliente, token, carregando, expirada, entrar, sair }),
    [cliente, token, carregando, expirada, entrar, sair],
  )

  return <SessaoClienteContext.Provider value={valor}>{children}</SessaoClienteContext.Provider>
}

export function useSessaoCliente(): SessaoCliente {
  const sessao = useContext(SessaoClienteContext)
  if (!sessao) throw new Error('useSessaoCliente precisa estar dentro de <SessaoClienteProvider>')
  return sessao
}
