import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { CabecalhoDoPasso, PedidoSemServicos } from '@/features/pedidos/CabecalhoDoPasso';
import { pedidoStyles as base } from '@/features/pedidos/pedidoStyles';
import { useNovoPedido } from '@/features/pedidos/useNovoPedido';
import { formatarPlaca } from '@/features/veiculos/placa';
import { useVeiculos } from '@/features/veiculos/useVeiculos';

// Passo 1 do pedido (I13): o cliente escolhe um dos seus veículos (I3). Sem
// nenhum, atalho para cadastrar — o formulário volta para cá (router.back) e a
// lista recarrega ao ganhar foco.
export default function PedidoVeiculoScreen() {
  const router = useRouter();
  const { lavaRapido, servicos, veiculo: escolhido, escolherVeiculo } = useNovoPedido();
  const { veiculos, carregando, erro, recarregar } = useVeiculos();

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

  // Só vale a escolha se o veículo ainda está na lista (pode ter sido removido).
  const selecionado = veiculos.find((veiculo) => veiculo.id === escolhido?.id) ?? null;

  function cadastrar() {
    router.push('/veiculos/form');
  }

  if (!lavaRapido || servicos.length === 0) {
    return (
      <SafeAreaView style={base.container}>
        <CabecalhoDoPasso titulo="Veículo" />
        <PedidoSemServicos />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={base.container}>
      <CabecalhoDoPasso titulo="Qual veículo?" passo={1} />

      {carregando ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
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
          <View style={[base.cartao, { alignItems: 'center', gap: 12 }]}>
            <Ionicons name="car-outline" size={40} color={colors.neutralGray} />
            <Text style={base.texto}>Você ainda não cadastrou nenhum veículo.</Text>
            <Pressable accessibilityRole="button" onPress={cadastrar} style={base.botao}>
              <Text style={base.botaoTexto}>Cadastrar veículo</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={base.conteudo}>
          {veiculos.map((veiculo) => {
            const ativo = selecionado?.id === veiculo.id;
            return (
              <Pressable
                key={veiculo.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: ativo }}
                accessibilityLabel={`${veiculo.modelo} ${formatarPlaca(veiculo.placa)}`}
                onPress={() => escolherVeiculo(veiculo)}
                style={[base.cartao, ativo && base.cartaoSelecionado, base.linha]}>
                <View style={{ flex: 1 }}>
                  <Text style={base.textoForte}>{veiculo.marca ? `${veiculo.marca} ${veiculo.modelo}` : veiculo.modelo}</Text>
                  <Text style={base.detalhe}>
                    {veiculo.cor} · {formatarPlaca(veiculo.placa)}
                  </Text>
                </View>
                <Ionicons
                  name={ativo ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={ativo ? colors.primary : colors.neutralGray}
                />
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" onPress={cadastrar}>
            <Text style={base.link}>+ Cadastrar outro veículo</Text>
          </Pressable>
        </ScrollView>
      )}

      <View style={base.rodape}>
        <Pressable
          accessibilityRole="button"
          disabled={!selecionado}
          onPress={() => router.push('/pedido/data-hora')}
          style={[base.botao, !selecionado && base.botaoDesabilitado]}>
          <Text style={base.botaoTexto}>Continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
