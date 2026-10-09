import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Onde o token de acesso do cliente fica guardado entre aberturas do app (I2):
// - celular (iOS/Android): expo-secure-store (Keychain/Keystore), nunca
//   AsyncStorage em texto puro;
// - Expo web (só desenvolvimento): o SecureStore não existe no navegador, então
//   cai no localStorage — limitação documentada em .specs/app_mobile.specs.md.

const CHAVE_TOKEN = 'washaway.tokenCliente'

function localStorageDoWeb(): Storage | null {
  return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorageDoWeb()?.getItem(CHAVE_TOKEN) ?? null
  return SecureStore.getItemAsync(CHAVE_TOKEN)
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorageDoWeb()?.setItem(CHAVE_TOKEN, token)
    return
  }
  await SecureStore.setItemAsync(CHAVE_TOKEN, token)
}

export async function limparToken(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorageDoWeb()?.removeItem(CHAVE_TOKEN)
    return
  }
  await SecureStore.deleteItemAsync(CHAVE_TOKEN)
}
