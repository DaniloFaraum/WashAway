import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { useLavaRapidos } from '@/features/lava-rapidos/useLavaRapidos';
import { setEmpresaSelecionada } from '@/features/lava-rapidos/onboarding/empresaSelecionada.storage';

export default function OnboardingScreen() {
  const router = useRouter();
  const { lavaRapidos, loading, error } = useLavaRapidos();

  async function handleEscolher(id: string) {
    await setEmpresaSelecionada(id);
    router.replace('/(tabs)');
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Não foi possível carregar os lava-rápidos: {error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Escolha seu lava-rápido</Text>
      <Text style={styles.subtitle}>Você poderá ver e agendar serviços dele.</Text>
      <FlatList
        data={lavaRapidos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardDistance}>{item.distance}</Text>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleEscolher(item.id)}
              accessibilityRole="button">
              <Text style={styles.buttonText}>Escolher</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.neutralGray,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.black,
    textAlign: 'center',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutralGray,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
  cardDistance: {
    fontSize: 13,
    color: colors.neutralGray,
    marginTop: 2,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
