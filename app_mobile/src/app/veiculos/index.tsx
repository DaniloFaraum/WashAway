import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { formatarPlaca } from '@/features/veiculos/placa';
import type { Veiculo } from '@/features/veiculos/service/veiculos.model';
import { VeiculoNaoEncontradoError } from '@/features/veiculos/service/veiculos.service';
import { useVeiculos } from '@/features/veiculos/useVeiculos';
import { veiculosStyles as base } from '@/features/veiculos/veiculosStyles';

// "Meus veículos" (I3): lista os veículos do cliente logado, com adicionar,
// editar e remover (com confirmação). Entrada pelo menu de conta da Home.

/** Pergunta antes de remover. No web o `Alert.alert` com botões não funciona: usa o `confirm` do navegador. */
function confirmarRemocao(veiculo: Veiculo, aoConfirmar: () => void) {
  const mensagem = `Remover ${veiculo.modelo} (${formatarPlaca(veiculo.placa)}) dos seus veículos?`;
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(mensagem)) aoConfirmar();
    return;
  }
  Alert.alert('Remover veículo', mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: aoConfirmar },
  ]);
}

function avisar(titulo: string, mensagem: string) {
  if (Platform.OS === 'web') globalThis.alert?.(mensagem);
  else Alert.alert(titulo, mensagem);
}

export default function MeusVeiculosScreen() {
  const router = useRouter();
  const { veiculos, carregando, erro, recarregar, remover } = useVeiculos();

  // O hook já carrega ao montar; ao voltar do formulário a tela ganha foco de
  // novo e a lista é recarregada (pula o primeiro foco, que é o da montagem).
  const primeiroFoco = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeiroFoco.current) {
        primeiroFoco.current = false;
        return;
      }
      void recarregar();
    }, [recarregar]),
  );

  function adicionar() {
    router.push('/veiculos/form');
  }

  function editar(veiculo: Veiculo) {
    router.push({
      pathname: '/veiculos/form',
      params: { id: veiculo.id, marca: veiculo.marca ?? '', modelo: veiculo.modelo, cor: veiculo.cor, placa: veiculo.placa },
    });
  }

  function pedirRemocao(veiculo: Veiculo) {
    confirmarRemocao(veiculo, async () => {
      try {
        await remover(veiculo.id);
      } catch (err) {
        if (err instanceof VeiculoNaoEncontradoError) void recarregar();
        avisar('Não foi possível remover', err instanceof Error ? err.message : 'Tente de novo.');
      }
    });
  }

  return (
    <SafeAreaView style={base.container}>
      <View style={base.topo}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={base.voltar}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={base.titulo}>Meus veículos</Text>
        {veiculos.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Adicionar veículo" onPress={adicionar} style={styles.adicionar}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.adicionarTexto}>Adicionar</Text>
          </Pressable>
        )}
      </View>

      {carregando ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.carregando} />
      ) : erro ? (
        <View style={base.conteudo}>
          <View style={base.cartao}>
            <Text style={base.erro}>{erro}</Text>
            <Pressable accessibilityRole="button" onPress={() => void recarregar()}>
              <Text style={base.link}>Tentar de novo</Text>
            </Pressable>
          </View>
        </View>
      ) : veiculos.length === 0 ? (
        <View style={base.conteudo}>
          <View style={[base.cartao, styles.vazio]}>
            <Ionicons name="car-outline" size={40} color={colors.neutralGray} />
            <Text style={styles.vazioTexto}>Você ainda não cadastrou nenhum veículo</Text>
            <Pressable accessibilityRole="button" onPress={adicionar} style={base.botao}>
              <Text style={base.botaoTexto}>Cadastrar meu primeiro veículo</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={base.conteudo}>
          {veiculos.map((veiculo) => (
            <View key={veiculo.id} style={[base.cartao, styles.item]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitulo} numberOfLines={1}>
                  {veiculo.marca ? `${veiculo.marca} ${veiculo.modelo}` : veiculo.modelo}
                </Text>
                <Text style={styles.itemDetalhe}>
                  {veiculo.cor} · <Text style={styles.placa}>{formatarPlaca(veiculo.placa)}</Text>
                </Text>
              </View>
              <View style={styles.acoes}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${veiculo.modelo}`}
                  onPress={() => editar(veiculo)}
                  style={styles.acao}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={base.link}>Editar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${veiculo.modelo}`}
                  onPress={() => pedirRemocao(veiculo)}
                  style={styles.acao}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[base.link, styles.remover]}>Remover</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  carregando: {
    marginTop: 40,
  },
  adicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  adicionarTexto: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  vazio: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  vazioTexto: {
    fontSize: 16,
    color: colors.black,
    textAlign: 'center',
  },
  item: {
    gap: 12,
  },
  itemInfo: {
    gap: 4,
  },
  itemTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
  itemDetalhe: {
    fontSize: 14,
    color: colors.neutralGray,
  },
  placa: {
    fontWeight: '700',
    color: colors.black,
    letterSpacing: 1,
  },
  acoes: {
    flexDirection: 'row',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  acao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remover: {
    color: colors.danger,
  },
});
