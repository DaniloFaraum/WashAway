import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { me } from '@/features/auth/service/auth.service';
import type { Cliente } from '@/features/clientes/service/clientes.model';

// "Meus dados" (I2): nome e e-mail do cliente logado, somente leitura, vindos de
// GET /clientes/me. Um 401 aqui já derruba a sessão pelo httpClient.

export default function MeusDadosScreen() {
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    me()
      .then((dados) => {
        if (ativo) setCliente(dados);
      })
      .catch((err) => {
        if (ativo) setErro(err instanceof Error ? err.message : 'Não foi possível carregar seus dados.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  function tentarDeNovo() {
    setCarregando(true);
    setErro(null);
    setTentativa((atual) => atual + 1);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topo}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.voltar}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.titulo}>Meus dados</Text>
      </View>

      {carregando ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.carregando} />
      ) : erro ? (
        <View style={styles.cartao}>
          <Text style={styles.erro}>{erro}</Text>
          <Pressable accessibilityRole="button" onPress={tentarDeNovo}>
            <Text style={styles.link}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : (
        cliente && (
          <View style={styles.cartao}>
            <Text style={styles.rotulo}>Nome</Text>
            <Text style={styles.valor}>{cliente.nome}</Text>
            <Text style={[styles.rotulo, styles.espaco]}>E-mail</Text>
            <Text style={styles.valor}>{cliente.email}</Text>
          </View>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  voltar: {
    padding: 4,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.black,
  },
  carregando: {
    marginTop: 40,
  },
  cartao: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  rotulo: {
    fontSize: 13,
    color: colors.neutralGray,
  },
  valor: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
  espaco: {
    marginTop: 12,
  },
  erro: {
    color: colors.danger,
    fontSize: 14,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: 8,
  },
});
