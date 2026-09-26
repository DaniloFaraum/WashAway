import AsyncStorage from '@react-native-async-storage/async-storage'

const EMPRESA_SELECIONADA_KEY = '@washaway/empresaSelecionadaId'

export async function getEmpresaSelecionada(): Promise<string | null> {
  return AsyncStorage.getItem(EMPRESA_SELECIONADA_KEY)
}

export async function setEmpresaSelecionada(id: string): Promise<void> {
  await AsyncStorage.setItem(EMPRESA_SELECIONADA_KEY, id)
}

export async function clearEmpresaSelecionada(): Promise<void> {
  await AsyncStorage.removeItem(EMPRESA_SELECIONADA_KEY)
}
