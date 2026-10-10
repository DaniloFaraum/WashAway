import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { useSessaoCliente } from '@/features/auth/SessaoClienteProvider';

// Menu de conta do cabeçalho da Home (I2): botão circular com a inicial do
// cliente → "Meus dados", "Meus veículos" (I3) e "Sair".

type ItemMenu = {
  rotulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  aoTocar: () => void;
  destrutivo?: boolean;
};

export function MenuConta() {
  const router = useRouter();
  const { cliente, sair } = useSessaoCliente();
  const [aberto, setAberto] = useState(false);

  const inicial = cliente?.nome.trim().charAt(0).toUpperCase() || '?';

  function escolher(acao: () => void) {
    setAberto(false);
    acao();
  }

  const itens: ItemMenu[] = [
    { rotulo: 'Meus dados', icone: 'person-outline', aoTocar: () => router.push('/meus-dados') },
    { rotulo: 'Meus veículos', icone: 'car-outline', aoTocar: () => router.push('/veiculos') },
    { rotulo: 'Sair', icone: 'log-out-outline', aoTocar: () => void sair(), destrutivo: true },
  ];

  return (
    <>
      <Pressable
        style={styles.botao}
        accessibilityRole="button"
        accessibilityLabel="Menu da conta"
        onPress={() => setAberto(true)}>
        <Text style={styles.inicial}>{inicial}</Text>
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable style={styles.fundo} onPress={() => setAberto(false)} accessibilityLabel="Fechar menu">
          <View style={styles.menu}>
            {cliente && (
              <View style={styles.cabecalho}>
                <Text style={styles.nome} numberOfLines={1}>
                  {cliente.nome}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {cliente.email}
                </Text>
              </View>
            )}
            {itens.map((item) => (
              <Pressable
                key={item.rotulo}
                style={styles.item}
                accessibilityRole="button"
                onPress={() => escolher(item.aoTocar)}>
                <Ionicons
                  name={item.icone}
                  size={20}
                  color={item.destrutivo ? colors.danger : colors.primary}
                />
                <Text style={[styles.itemTexto, item.destrutivo && styles.itemTextoDestrutivo]}>
                  {item.rotulo}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  inicial: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'web' ? 120 : 110,
    paddingHorizontal: 20,
  },
  menu: {
    minWidth: 220,
    maxWidth: 300,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 8,
  },
  cabecalho: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  nome: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
  },
  email: {
    fontSize: 13,
    color: colors.neutralGray,
    marginTop: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemTexto: {
    fontSize: 15,
    color: colors.black,
  },
  itemTextoDestrutivo: {
    color: colors.danger,
  },
});
