import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold
} from '@expo-google-fonts/poppins';
import {
  AlbertSans_400Regular,
  AlbertSans_500Medium,
  AlbertSans_700Bold
} from '@expo-google-fonts/albert-sans';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useEmpresaSelecionadaGate } from '@/features/lava-rapidos/onboarding/useEmpresaSelecionadaGate';

// Impede que a tela de Splash suma antes das fontes serem carregadas
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // 1. Executa o carregamento das fontes
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
    AlbertSans_400Regular,
    AlbertSans_500Medium,
    AlbertSans_700Bold,
  });

  // 1b. Checa se o consumidor já escolheu uma empresa (lava-rápido) no onboarding
  const { pronto: empresaChecada, temEmpresaSelecionada } = useEmpresaSelecionadaGate();

  // 2. Esconde a Splash Screen assim que as fontes estiverem carregadas
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // 3. Sem empresa escolhida ainda: manda pro onboarding assim que a checagem terminar.
  // Navegação imperativa (em vez de `<Redirect>`) porque `<Redirect>` depende de
  // `useFocusEffect`/`useNavigation` — cujo comportamento no layout raiz (fora de
  // qualquer `Stack.Screen`) não é claro; `router.replace` não tem essa ambiguidade.
  // O `Stack` continua sempre montado com todas as telas registradas, então navegar
  // de volta pra `(tabs)` depois de escolher a empresa (em `onboarding.tsx`) sempre funciona.
  useEffect(() => {
    if (empresaChecada && !temEmpresaSelecionada) {
      router.replace('/onboarding');
    }
  }, [empresaChecada, temEmpresaSelecionada, router]);

  // Se as fontes ainda não carregaram (e não houve erro), ou a checagem da empresa
  // selecionada ainda não terminou, não renderiza o app ainda
  if ((!loaded && !error) || !empresaChecada) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="servicos" />
        <Stack.Screen name="disponibilidade" />
        <Stack.Screen name="detail" />
      </Stack>
    </ThemeProvider>
  );
}