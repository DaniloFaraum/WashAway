import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getToken, limparToken, setToken } from '../features/auth/tokenStorage'

// `react-native` e `expo-secure-store` não rodam no Node: mocka os dois (o
// vi.mock é içado acima dos imports) e alterna a plataforma por teste.
const plataforma = vi.hoisted(() => ({ OS: 'ios' as string }))
const secureStore = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}))

vi.mock('react-native', () => ({ Platform: plataforma }))
vi.mock('expo-secure-store', () => secureStore)

function localStorageFalso(): Storage {
  const dados = new Map<string, string>()
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => void dados.set(chave, valor),
    removeItem: (chave: string) => void dados.delete(chave),
    clear: () => dados.clear(),
    key: () => null,
    get length() {
      return dados.size
    },
  }
}

describe('tokenStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageFalso())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('no celular usa o expo-secure-store (não o localStorage)', async () => {
    plataforma.OS = 'android'
    secureStore.getItemAsync.mockResolvedValue('tok-seguro')

    await setToken('tok-seguro')
    const token = await getToken()
    await limparToken()

    expect(secureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), 'tok-seguro')
    expect(token).toBe('tok-seguro')
    expect(secureStore.deleteItemAsync).toHaveBeenCalled()
    expect(globalThis.localStorage.length).toBe(0)
  })

  it('no web cai no localStorage (fallback só de desenvolvimento)', async () => {
    plataforma.OS = 'web'

    await setToken('tok-web')
    expect(await getToken()).toBe('tok-web')

    await limparToken()
    expect(await getToken()).toBeNull()
    expect(secureStore.setItemAsync).not.toHaveBeenCalled()
  })

  it('no web sem localStorage devolve null sem quebrar', async () => {
    plataforma.OS = 'web'
    vi.stubGlobal('localStorage', undefined)

    await setToken('tok')
    expect(await getToken()).toBeNull()
  })
})
