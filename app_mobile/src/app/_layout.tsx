import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
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
import { SessaoClienteProvider, useSessaoCliente } from '@/features/auth/SessaoClienteProvider';

// Impede que a tela de Splash suma antes das fontes serem carregadas
SplashScreen.preventAutoHideAsync();

// Telas acessíveis sem sessão (I1/I2).
const TELAS_PUBLICAS = ['login', 'cadastro'];

export default function RootLayout() {
  return (
    <SessaoClienteProvider>
      <RootNavigator />
    </SessaoClienteProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  // 1. Executa o carregamento das fontes
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
    AlbertSans_400Regular,
    AlbertSans_500Medium,
    AlbertSans_700Bold,
  });

  // 1b. Sessão do cliente: lê o token salvo e valida no back-end (I2)
  const { token, carregando: carregandoSessao, expirada } = useSessaoCliente();
  const emTelaPublica = TELAS_PUBLICAS.includes(segments[0] ?? '');

  // 2. Esconde a Splash Screen assim que as fontes estiverem carregadas
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // 3. Gate de sessão: sem cliente logado → /login (com "Sua sessão expirou" se
  // caiu por 401); logado numa tela pública (login/cadastro) → Home.
  // Navegação imperativa (em vez de `<Redirect>`) porque `<Redirect>` depende de
  // `useFocusEffect`/`useNavigation` — cujo comportamento no layout raiz (fora de
  // qualquer `Stack.Screen`) não é claro; `router.replace` não tem essa ambiguidade.
  // O `Stack` continua sempre montado com todas as telas registradas.
  useEffect(() => {
    if (carregandoSessao) return;
    if (!token && !emTelaPublica) {
      router.replace(expirada ? { pathname: '/login', params: { expirada: '1' } } : '/login');
    } else if (token && emTelaPublica) {
      router.replace('/(tabs)');
    }
  }, [carregandoSessao, token, expirada, emTelaPublica, router]);

  // Se as fontes ainda não carregaram (e não houve erro), ou a sessão ainda não
  // foi checada, não renderiza o app ainda
  if ((!loaded && !error) || carregandoSessao) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
        <Stack.Screen name="meus-dados" />
        <Stack.Screen name="servicos" />
        <Stack.Screen name="disponibilidade" />
        <Stack.Screen name="servicos/[servicoId]" />
      </Stack>
    </ThemeProvider>
  );
}
