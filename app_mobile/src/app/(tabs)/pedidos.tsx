import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { formatarDataHora } from '@/features/pedidos/dataHora';
import { pedidoStyles as base } from '@/features/pedidos/pedidoStyles';
import { separarPedidos } from '@/features/pedidos/separarPedidos';
import type { PedidoCliente } from '@/features/pedidos/service/pedidos.model';
import { SeloStatus } from '@/features/pedidos/SeloStatus';
import { usePedidosCliente } from '@/features/pedidos/usePedidosCliente';
import { formatarPreco } from '@/utils/formatarPreco';

// Aba "Meus pedidos" (I18, no lugar do Explore do template): "Próximos",
// "Anteriores" e "Recusados", sempre buscados no backend (ao focar e ao puxar).

function ItemPedido({ pedido, aoTocar }: { pedido: PedidoCliente; aoTocar: () => void }) {
  const naoVisto = pedido.status === 'recusado' && !pedido.recusaVistaEm;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pedido em ${pedido.lavaRapido.nome}, ${formatarDataHora(pedido.horario)}`}
      onPress={aoTocar}
      style={({ pressed }) => [base.cartao, naoVisto && styles.cartaoNaoVisto, pressed && styles.pressionado]}>
      <View style={base.linha}>
        <Text style={[base.textoForte, styles.nome]} numberOfLines={1}>
          {pedido.lavaRapido.nome || 'Lava-rápido'}
        </Text>
        <SeloStatus status={pedido.status} />
      </View>
      <View style={base.linha}>
        <Text style={base.detalhe}>{formatarDataHora(pedido.horario)}</Text>
        <Text style={base.textoForte}>{formatarPreco(pedido.precoTotal)}</Text>
      </View>
      {naoVisto && <Text style={styles.novo}>Novo</Text>}
    </Pressable>
  );
}

export default function MeusPedidosScreen() {
  const router = useRouter();
  const { pedidos, carregando, atualizando, erro, recarregar } = usePedidosCliente();

  const secoes = useMemo(() => {
    const { proximos, anteriores, recusados } = separarPedidos(pedidos);
    return [
      { titulo: 'Próximos', data: proximos },
      { titulo: 'Anteriores', data: anteriores },
      { titulo: 'Recusados', data: recusados },
    ].filter((secao) => secao.data.length > 0);
  }, [pedidos]);

  function abrir(pedido: PedidoCliente) {
    router.push({ pathname: '/pedidos/[id]', params: { id: pedido.id } });
  }

  const atualizar = <RefreshControl refreshing={atualizando} onRefresh={() => void recarregar()} colors={[colors.primary]} />;

  return (
    <SafeAreaView style={[base.container, styles.container]} edges={['top', 'left', 'right']}>
      <View style={base.topo}>
        <Text style={base.titulo}>Meus pedidos</Text>
      </View>

      {carregando ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.carregando} />
      ) : erro && pedidos.length === 0 ? (
        <View style={[base.conteudo, styles.topoConteudo]}>
          <View style={base.cartao}>
            <Text style={base.erro}>{erro}</Text>
            <Pressable accessibilityRole="button" onPress={() => void recarregar()}>
              <Text style={base.link}>Tentar de novo</Text>
            </Pressable>
          </View>
        </View>
      ) : pedidos.length === 0 ? (
        <View style={[base.conteudo, styles.topoConteudo]}>
          <View style={[base.cartao, styles.vazio]}>
            <Ionicons name="receipt-outline" size={40} color={colors.neutralGray} />
            <Text style={styles.vazioTexto}>Você ainda não tem pedidos</Text>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/')} style={base.botao}>
              <Text style={base.botaoTexto}>Encontrar um lava-rápido</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={(pedido) => pedido.id}
          contentContainerStyle={[base.conteudo, styles.topoConteudo]}
          refreshControl={atualizar}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={erro ? <Text style={base.erro}>{erro}</Text> : null}
          renderSectionHeader={({ section }) => (
            <Text style={[base.secaoTitulo, styles.secao]}>
              {section.titulo} ({section.data.length})
            </Text>
          )}
          renderItem={({ item }) => <ItemPedido pedido={item} aoTocar={() => abrir(item)} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'web' ? 64 : 0,
  },
  carregando: {
    marginTop: 40,
  },
  topoConteudo: {
    paddingTop: 12,
  },
  secao: {
    marginTop: 8,
  },
  nome: {
    flex: 1,
  },
  cartaoNaoVisto: {
    borderColor: colors.danger,
  },
  pressionado: {
    opacity: 0.7,
  },
  novo: {
    alignSelf: 'flex-start',
    color: colors.danger,
    fontSize: 12,
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
});
