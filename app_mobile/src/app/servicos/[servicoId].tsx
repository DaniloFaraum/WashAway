import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Clock } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { useServicos } from '@/features/servicos/useServicos';
import { useServicosSelecionados } from '@/features/servicos/servicosSelecionados';
import { formatarDuracao } from '@/utils/formatarDuracao';
import { formatarPreco } from '@/utils/formatarPreco';

/**
 * Detalhe de um serviço (combo) do lava-rápido, com os dados reais de
 * `GET /servicos?lavaRapidoId=`. Aberto pelo card da tela de serviços; o botão
 * "Selecionar" marca o serviço no mesmo carrinho da lista e volta para ela.
 */
export default function ServicoDetalheScreen() {
  const router = useRouter();
  const { servicoId, id, nome } = useLocalSearchParams<{
    servicoId: string;
    id?: string;
    nome?: string;
  }>();

  const { servicos, loading, error } = useServicos(id);
  const servico = servicos.find((s) => s.id === servicoId);
  const { selecionados, selecionar } = useServicosSelecionados(id);
  const jaSelecionado = servico ? selecionados.has(servico.id) : false;

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/servicos', params: { id, nome } });
    }
  };

  const confirmarSelecao = () => {
    if (!servico) return;
    selecionar(servico.id);
    voltar();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={voltar} style={styles.backButton} accessibilityLabel="Voltar">
          <ArrowLeft color={colors.black} size={22} />
        </TouchableOpacity>
        <View style={styles.headerTexts}>
          <Text style={styles.headerTitle}>Detalhe do serviço</Text>
          <Text style={styles.headerSubtitle}>{nome || 'Lava-rápido'}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
        {error && <Text style={styles.errorText}>Não foi possível carregar o serviço.</Text>}
        {!loading && !error && !servico && (
          <Text style={styles.emptyText}>Serviço não encontrado.</Text>
        )}

        {servico && (
          <>
            <Text style={styles.serviceTitle}>{servico.nome}</Text>
            {servico.categorias.length > 0 && (
              <Text style={styles.categorias}>{servico.categorias.join(' · ')}</Text>
            )}

            <View style={styles.resumoRow}>
              <Text style={styles.servicePrice}>{formatarPreco(servico.preco)}</Text>
              <View style={styles.badge}>
                <Clock color={colors.neutralGray} size={14} />
                <Text style={styles.badgeText}>~{formatarDuracao(servico.duracaoMinutos)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>O que está incluso</Text>
            {servico.itens.length === 0 && (
              <Text style={styles.emptyText}>Nenhum item cadastrado neste serviço.</Text>
            )}
            <View style={styles.itensList}>
              {servico.itens.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.checkIcon}>
                    <Check color={colors.white} size={12} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemNome}>{item.nome}</Text>
                    {!!item.categoria && <Text style={styles.itemCategoria}>{item.categoria}</Text>}
                  </View>
                  <Text style={styles.itemDuracao}>{formatarDuracao(item.duracaoMinutos)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {servico && (
        <View style={styles.footerContainer}>
          <View>
            <Text style={styles.footerLabel}>Total do serviço</Text>
            <Text style={styles.footerPrice}>
              {formatarPreco(servico.preco)} · ~{formatarDuracao(servico.duracaoMinutos)}
            </Text>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={confirmarSelecao}>
            <Text style={styles.actionButtonText}>{jaSelecionado ? 'Já selecionado' : 'Selecionar'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.black },
  headerSubtitle: { fontSize: 12, color: colors.neutralGray },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  errorText: { color: colors.danger, marginBottom: 12 },
  emptyText: { color: colors.neutralGray, marginBottom: 12 },
  serviceTitle: { fontSize: 20, fontWeight: '700', color: colors.primary },
  categorias: { fontSize: 13, color: colors.neutralGray, marginTop: 4 },
  resumoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  servicePrice: { fontSize: 20, fontWeight: '700', color: colors.black },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, color: colors.neutralGray, fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.black, marginBottom: 12 },
  itensList: { gap: 10, marginBottom: 24 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemNome: { fontSize: 14, fontWeight: '600', color: colors.black },
  itemCategoria: { fontSize: 12, color: colors.neutralGray },
  itemDuracao: { fontSize: 12, fontWeight: '600', color: colors.neutralGray },
  footerContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLabel: { fontSize: 12, color: colors.neutralGray },
  footerPrice: { fontSize: 16, fontWeight: '700', color: colors.black },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
