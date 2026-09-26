import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, Image, Modal, Switch, ActivityIndicator
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Ícones do Lucide
import {
  Search, SlidersHorizontal, Check, Star, X, AlertTriangle
} from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { useServicos } from '@/features/servicos/useServicos';
import type { Servico } from '@/features/servicos/service/servicos.model';
import { useIntercorrencias, getIntercorrenciaRelevante, diasAte } from '@/features/intercorrencias/useIntercorrencias';
import { formatarDataBR } from '@/features/intercorrencias/formatarData';

const SERVICO_IMAGEM_PLACEHOLDER = 'https://placehold.co/300x300?text=Servi%C3%A7o';

export default function ServicosScreen() {
  const router = useRouter();

  // Recebe o ID e Nome do lava-rápido passados na navegação
  const { id, nome } = useLocalSearchParams<{ id?: string; nome?: string }>();

  const { servicos, loading, error } = useServicos(id);
  const { intercorrencias } = useIntercorrencias(id);
  const intercorrenciaRelevante = getIntercorrenciaRelevante(intercorrencias);

  const [showAllCategories, setShowAllCategories] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [proximityEnabled, setProximityEnabled] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Estados dos Filtros (visuais, sem ligação com dados reais ainda)
  const [minPrice, setMinPrice] = useState(50);
  const [maxPrice, setMaxPrice] = useState(300);
  const [distance, setDistance] = useState(10);

  // Ao carregar os serviços do lava-rápido, seleciona todos por padrão
  useEffect(() => {
    setSelecionados(new Set(servicos.map((s) => s.id)));
  }, [servicos]);

  const toggleService = (servicoId: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(servicoId)) {
        next.delete(servicoId);
      } else {
        next.add(servicoId);
      }
      return next;
    });
  };

  const categorias = [...new Set(servicos.map((s) => s.categoria).filter(Boolean))];

  const toggleCategoriaFiltro = (categoria: string) => {
    setCategoriaFiltro((prev) => (prev === categoria ? null : categoria));
  };

  const servicosVisiveis = categoriaFiltro
    ? servicos.filter((s) => s.categoria === categoriaFiltro)
    : servicos;

  // Cálculos do Carrinho
  const selectedServices = servicos.filter((s) => selecionados.has(s.id));
  const totalItems = selectedServices.length;
  const totalPrice = selectedServices.reduce((sum, item) => sum + item.preco, 0);

  const visibleCategories = showAllCategories ? categorias : categorias.slice(0, 4);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Cabeçalho dinâmico informando o Lava-rápido selecionado */}
        <View style={styles.lavaRapidoHeader}>
          <Text style={styles.lavaRapidoLabel}>Lava-rápido selecionado:</Text>
          <Text style={styles.lavaRapidoName}>{nome || 'Lava-rápido Padrão'}</Text>
        </View>

        {/* Aviso de disponibilidade (intercorrência de hoje ou próxima) */}
        {intercorrenciaRelevante && (
          <TouchableOpacity
            style={styles.avisoBanner}
            onPress={() => router.push({ pathname: '/disponibilidade', params: { id, nome } })}
          >
            <AlertTriangle color={colors.danger} size={20} />
            <Text style={styles.avisoTexto}>
              {diasAte(intercorrenciaRelevante.data) === 0
                ? `Fechado hoje: ${intercorrenciaRelevante.motivo}`
                : `Indisponível em breve (${formatarDataBR(intercorrenciaRelevante.data)}): ${intercorrenciaRelevante.motivo}`}
              {' — ver disponibilidade'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Barra de Pesquisa e Filtro */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search color={colors.neutralGray || '#6B7280'} size={20} />
            <TextInput
              placeholder="Encontre seu serviço..."
              placeholderTextColor={colors.neutralGray || '#6B7280'}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterVisible(true)}>
            <SlidersHorizontal color={colors.white} size={20} />
          </TouchableOpacity>
        </View>

        {/* Categorias (derivadas dos serviços reais, funcionam como filtro) */}
        {categorias.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categorias</Text>
              {categorias.length > 4 && (
                <TouchableOpacity onPress={() => setShowAllCategories(!showAllCategories)}>
                  <Text style={styles.seeAllText}>
                    {showAllCategories ? 'Ver menos' : 'Ver todos'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.categoriesGrid}>
              {visibleCategories.map((categoria) => (
                <TouchableOpacity
                  key={categoria}
                  style={[
                    styles.categoryCard,
                    categoriaFiltro === categoria && styles.categoryCardSelected,
                  ]}
                  onPress={() => toggleCategoriaFiltro(categoria)}
                >
                  <Text style={styles.categoryText}>{categoria}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Serviços */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Serviços</Text>
        </View>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}
        {error && <Text style={styles.errorText}>Não foi possível carregar os serviços.</Text>}
        {!loading && !error && servicosVisiveis.length === 0 && (
          <Text style={styles.emptyText}>Nenhum serviço disponível.</Text>
        )}

        <View style={styles.servicesList}>
          {servicosVisiveis.map((item) => {
            const isSelected = selecionados.has(item.id);
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: SERVICO_IMAGEM_PLACEHOLDER }} style={styles.cardImage} />
                  <TouchableOpacity
                    style={[styles.checkBadge, !isSelected && styles.checkBadgeInactive]}
                    onPress={() => toggleService(item.id)}
                  >
                    {isSelected && <Check color={colors.white} size={14} />}
                  </TouchableOpacity>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.nome}</Text>
                  <Text style={styles.cardCategoria}>{item.categoria}</Text>
                  <Text style={styles.priceText}>R$ {item.preco.toFixed(2).replace('.', ',')}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Rodapé Dinâmico */}
      <View style={styles.cartFooterContainer}>
        <View>
          <Text style={styles.cartItemsText}>{totalItems} {totalItems === 1 ? 'item selecionado' : 'itens selecionados'}</Text>
          <Text style={styles.cartTotalText}>R$ {totalPrice.toFixed(2).replace('.', ',')}</Text>
        </View>
        <TouchableOpacity style={styles.cartButton}>
          <Text style={styles.cartButtonText}>Avançar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Filtros */}
      <Modal visible={filterVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <X color={colors.black || '#000'} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Proximidade</Text>
                <Switch
                  value={proximityEnabled}
                  onValueChange={setProximityEnabled}
                  trackColor={{ false: '#D1D5DB', true: colors.primary }}
                />
              </View>

              <View style={styles.filterSectionCol}>
                <Text style={styles.filterLabel}>Avaliações</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4].map((s) => (
                    <Star key={s} color="#FBBF24" fill="#FBBF24" size={22} />
                  ))}
                  <Star color="#FBBF24" size={22} />
                </View>
                <Text style={styles.subText}>Mostrando 4+ estrelas</Text>
              </View>

              <View style={styles.filterSectionCol}>
                <Text style={styles.filterLabel}>Faixa de preço</Text>
                <View style={styles.priceLabels}>
                  <Text style={styles.subText}>Mín: R$ {minPrice.toFixed(0)}</Text>
                  <Text style={styles.subText}>Máx: R$ {maxPrice.toFixed(0)}</Text>
                </View>

                <Slider
                  style={styles.sliderStyle}
                  minimumValue={10}
                  maximumValue={150}
                  value={minPrice}
                  onValueChange={setMinPrice}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor="#D1D5DB"
                  thumbTintColor={colors.primary}
                />

                <Slider
                  style={styles.sliderStyle}
                  minimumValue={150}
                  maximumValue={500}
                  value={maxPrice}
                  onValueChange={setMaxPrice}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor="#D1D5DB"
                  thumbTintColor={colors.primary}
                />
              </View>

              <View style={styles.filterSectionCol}>
                <View style={styles.priceLabels}>
                  <Text style={styles.filterLabel}>Distância máxima</Text>
                  <Text style={styles.subText}>{distance.toFixed(0)} km</Text>
                </View>
                <Slider
                  style={styles.sliderStyle}
                  minimumValue={1}
                  maximumValue={50}
                  value={distance}
                  onValueChange={setDistance}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor="#D1D5DB"
                  thumbTintColor={colors.primary}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={() => setFilterVisible(false)}
            >
              <Text style={styles.applyFilterText}>Selecionar Lava-rápido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  lavaRapidoHeader: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  lavaRapidoLabel: { fontSize: 12, color: colors.neutralGray || '#6B7280' },
  lavaRapidoName: { fontSize: 18, fontWeight: '700', color: colors.primary },
  avisoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  avisoTexto: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.danger },
  searchContainer: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, marginLeft: 8, height: 44 },
  filterButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.black || '#000' },
  seeAllText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  errorText: { color: colors.danger, marginBottom: 12 },
  emptyText: { color: colors.neutralGray || '#6B7280', marginBottom: 12 },
  servicesList: { marginBottom: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageWrapper: { position: 'relative' },
  cardImage: { width: 90, height: 90 },
  checkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeInactive: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: colors.white,
  },
  cardContent: { flex: 1, padding: 12, justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  cardCategoria: { fontSize: 12, color: colors.neutralGray || '#6B7280', marginVertical: 4 },
  priceText: { fontSize: 14, fontWeight: '700', color: colors.black || '#000' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.black || '#000',
  },
  cartFooterContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cartItemsText: { fontSize: 12, color: colors.neutralGray || '#6B7280' },
  cartTotalText: { fontSize: 16, fontWeight: '700', color: colors.black || '#000' },
  cartButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cartButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  modalContent: {
    width: '82%',
    backgroundColor: colors.white,
    padding: 20,
    justifyContent: 'space-between'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.black || '#000' },
  filterSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  filterSectionCol: { marginVertical: 10 },
  filterLabel: { fontSize: 14, fontWeight: '700', color: colors.black || '#000' },
  starsRow: { flexDirection: 'row', gap: 4, marginVertical: 4 },
  subText: { fontSize: 12, color: colors.neutralGray || '#6B7280' },
  priceLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  sliderStyle: { width: '100%', height: 30 },
  applyFilterButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  applyFilterText: { fontWeight: '700', color: colors.white, fontSize: 15 },
});
