import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
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

// Impede que a tela de Splash suma antes das fontes serem carregadas
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // 1. Executa o carregamento das fontes
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
    AlbertSans_400Regular,
    AlbertSans_500Medium,
    AlbertSans_700Bold,
  });

  // 2. Esconde a Splash Screen assim que as fontes estiverem carregadas
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Se as fontes ainda não carregaram (e não houve erro), não renderiza o app ainda
  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="servicos" />
        <Stack.Screen name="detail" />
      </Stack>
    </ThemeProvider>
  );
}