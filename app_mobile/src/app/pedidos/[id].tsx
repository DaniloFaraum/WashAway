import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { formatarDataHora } from '@/features/pedidos/dataHora';
import { pedidoStyles as base } from '@/features/pedidos/pedidoStyles';
import { atualizarRecusasNaoVistas } from '@/features/pedidos/recusasNaoVistas';
import { SeloStatus } from '@/features/pedidos/SeloStatus';
import type { PedidoCliente } from '@/features/pedidos/service/pedidos.model';
import { buscarMeuPedido, marcarRecusaVista } from '@/features/pedidos/service/pedidos.service';
import { formatarPlaca } from '@/features/veiculos/placa';
import { formatarPreco } from '@/utils/formatarPreco';

// Detalhe de um pedido do cliente (I18). Recarrega do backend sempre que abre
// (foco). Aceito: "Agendamento confirmado". Recusado: "Pedido recusado", o
// motivo e os atalhos para remarcar; abrir um recusado marca a recusa como vista.

export default function DetalhePedidoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [pedido, setPedido] = useState<PedidoCliente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const ultimaBusca = useRef(0);

  const carregar = useCallback(async () => {
    if (!id) {
      setErro('Pedido não encontrado.');
      setCarregando(false);
      return;
    }
    const busca = ++ultimaBusca.current;
    try {
      const atual = await buscarMeuPedido(id);
      if (busca !== ultimaBusca.current) return;
      setPedido(atual);
      setErro(null);
      if (atual.status === 'recusado' && !atual.recusaVistaEm) {
        // Falha aqui não atrapalha a tela: o badge só continua até a próxima vez.
        void marcarRecusaVista(atual.id)
          .then(() => atualizarRecusasNaoVistas())
          .catch(() => undefined);
      }
    } catch (err) {
      if (busca === ultimaBusca.current) setErro(err instanceof Error ? err.message : 'Não foi possível carregar o pedido.');
    } finally {
      if (busca === ultimaBusca.current) setCarregando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
      return () => {
        ultimaBusca.current += 1;
      };
    }, [carregar]),
  );

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/pedidos');
  }

  function outroHorario(atual: PedidoCliente) {
    router.push({ pathname: '/servicos', params: { id: atual.lavaRapido.id, nome: atual.lavaRapido.nome } });
  }

  return (
    <SafeAreaView style={base.container}>
      <View style={base.topo}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={voltar} style={base.voltar}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={base.titulo}>Pedido</Text>
      </View>

      {carregando ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.carregando} />
      ) : !pedido ? (
        <View style={[base.conteudo, styles.topoConteudo]}>
          <View style={base.cartao}>
            <Text style={base.erro}>{erro ?? 'Pedido não encontrado.'}</Text>
            <Pressable accessibilityRole="button" onPress={() => void carregar()}>
              <Text style={base.link}>Tentar de novo</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[base.conteudo, styles.topoConteudo]}>
          {erro && <Text style={base.erro}>{erro}</Text>}

          {pedido.status === 'aceito' && (
            <View style={[styles.destaque, styles.destaqueAceito]}>
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
              <View style={styles.destaqueTextos}>
                <Text style={[styles.destaqueTitulo, { color: colors.primary }]}>Agendamento confirmado</Text>
                <Text style={base.texto}>O lava-rápido confirmou o seu horário.</Text>
              </View>
            </View>
          )}

          {pedido.status === 'recusado' && (
            <View style={[styles.destaque, styles.destaqueRecusado]}>
              <Ionicons name="close-circle" size={28} color={colors.danger} />
              <View style={styles.destaqueTextos}>
                <Text style={[styles.destaqueTitulo, { color: colors.danger }]}>Pedido recusado</Text>
                {pedido.motivoRecusa ? (
                  <Text style={base.texto}>Motivo: {pedido.motivoRecusa}</Text>
                ) : (
                  <Text style={base.texto}>O lava-rápido não informou o motivo.</Text>
                )}
                <View style={styles.acoes}>
                  <Pressable accessibilityRole="button" onPress={() => outroHorario(pedido)} style={[base.botao, styles.acao]}>
                    <Text style={base.botaoTexto}>Outro horário</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.navigate('/')}
                    style={[base.botao, styles.acao, styles.botaoSecundario]}>
                    <Text style={[base.botaoTexto, { color: colors.primary }]}>Outro lava-rápido</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          <View style={base.cartao}>
            <View style={base.linha}>
              <Text style={base.secaoTitulo}>Status</Text>
              <SeloStatus status={pedido.status} />
            </View>
          </View>

          <View style={base.cartao}>
            <Text style={base.secaoTitulo}>Lava-rápido</Text>
            <Text style={base.textoForte}>{pedido.lavaRapido.nome || 'Lava-rápido'}</Text>
            {pedido.lavaRapido.endereco && <Text style={base.detalhe}>{pedido.lavaRapido.endereco}</Text>}
          </View>

          <View style={base.cartao}>
            <Text style={base.secaoTitulo}>Data e hora</Text>
            <Text style={base.texto}>{formatarDataHora(pedido.horario)}</Text>
          </View>

          {pedido.veiculo && (
            <View style={base.cartao}>
              <Text style={base.secaoTitulo}>Veículo</Text>
              <Text style={base.texto}>
                {pedido.veiculo.marca ? `${pedido.veiculo.marca} ${pedido.veiculo.modelo}` : pedido.veiculo.modelo}
              </Text>
              <Text style={base.detalhe}>
                {pedido.veiculo.cor} · {formatarPlaca(pedido.veiculo.placa)}
              </Text>
            </View>
          )}

          <View style={base.cartao}>
            <Text style={base.secaoTitulo}>Serviços</Text>
            {pedido.servicos.map((servico) => (
              <View key={servico.id} style={base.linha}>
                <Text style={[base.texto, styles.servicoNome]}>{servico.nome}</Text>
                <Text style={base.texto}>{formatarPreco(servico.preco)}</Text>
              </View>
            ))}
            <View style={[base.linha, styles.total]}>
              <Text style={base.textoForte}>Total</Text>
              <Text style={base.textoForte}>{formatarPreco(pedido.precoTotal)}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  carregando: {
    marginTop: 40,
  },
  topoConteudo: {
    paddingTop: 12,
  },
  destaque: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
  },
  destaqueAceito: {
    backgroundColor: '#E0EFFD',
    borderColor: colors.primary,
  },
  destaqueRecusado: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.danger,
  },
  destaqueTextos: {
    flex: 1,
    gap: 6,
  },
  destaqueTitulo: {
    fontSize: 18,
    fontWeight: '800',
  },
  acoes: {
    gap: 8,
    marginTop: 6,
  },
  acao: {
    paddingVertical: 12,
  },
  botaoSecundario: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  servicoNome: {
    flex: 1,
  },
  total: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
});
