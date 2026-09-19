import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, Image, Modal, Switch
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Ícones do Lucide
import { 
  Search, SlidersHorizontal, Clock, Check, Star, X,
  Car, Sparkles, Droplet, Eye, ShieldCheck, Palette, Umbrella, CloudRain, Shield 
} from 'lucide-react-native';

// Importações com o alias "@/constants/colors" padronizado pelo seu colega
import { colors } from '@/constants/colors';

// Tipagem dos serviços e categorias
interface ServiceItem {
  id: string;
  title: string;
  desc: string;
  price: number;
  time: number;
  image: string;
  selected: boolean;
}

export default function ServicosScreen() {
  const router = useRouter();
  
  // Recebe o ID e Nome do lava-rápido passados na navegação do seu colega
  const { id, nome } = useLocalSearchParams<{ id?: string; nome?: string }>();

  const [showAllCategories, setShowAllCategories] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [proximityEnabled, setProximityEnabled] = useState(false);

  // Estados dos Filtros
  const [minPrice, setMinPrice] = useState(50);
  const [maxPrice, setMaxPrice] = useState(300);
  const [distance, setDistance] = useState(10);

  // Lista de Serviços
  const initialServices: ServiceItem[] = [
    {
      id: '1',
      title: 'Lavagem Completa',
      desc: 'Lavagem externa e interna completa com produtos...',
      price: 100.00,
      time: 40,
      image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=500',
      selected: true,
    },
    {
      id: '2',
      title: 'Higienização Interna',
      desc: 'Limpeza profunda do interior do veículo, incluindo estofados...',
      price: 80.00,
      time: 30,
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQx6RA5P0_G-6ZvW_sywJOQgG0sTZzEjPNkMyWjAgMib8TKu1_xRXRJWyuT&s=10',
      selected: true,
    }
  ];

  const [services, setServices] = useState<ServiceItem[]>(initialServices);

  // Alterna a seleção do serviço
  const toggleService = (serviceId: string) => {
    setServices(prev =>
      prev.map(item => item.id === serviceId ? { ...item, selected: !item.selected } : item)
    );
  };

  // Cálculos do Carrinho
  const selectedServices = services.filter(s => s.selected);
  const totalItems = selectedServices.length;
  const totalPrice = selectedServices.reduce((sum, item) => sum + item.price, 0);
  const totalTime = selectedServices.reduce((sum, item) => sum + item.time, 0);

  const categories = [
    { id: '1', title: 'Lavagem\nExterna', icon: Car },
    { id: '2', title: 'Lavagem\nInterna', icon: Sparkles },
    { id: '3', title: 'Polimento', icon: Droplet },
    { id: '4', title: 'Restauração\nde faróis', icon: Eye },
    { id: '5', title: 'Hidratação\nde Couro', icon: ShieldCheck },
    { id: '6', title: 'Cristalização\nde Pintura', icon: Palette },
    { id: '7', title: 'Imperme-\nabilizar', icon: Umbrella },
    { id: '8', title: 'Remoção\nChuva Ácida', icon: CloudRain },
    { id: '9', title: 'Aplicar\nProtetores', icon: Shield },
  ];

  const visibleCategories = showAllCategories ? categories : categories.slice(0, 4);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Cabeçalho dinâmico informando o Lava-rápido vindo da tela do seu amigo */}
        <View style={styles.lavaRapidoHeader}>
          <Text style={styles.lavaRapidoLabel}>Lava-rápido selecionado:</Text>
          <Text style={styles.lavaRapidoName}>{nome || 'Lava-rápido Padrão'}</Text>
        </View>

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

        {/* Destaques do Dia */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Destaques do Dia</Text>
          <TouchableOpacity><Text style={styles.seeAllText}>Ver todos</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
          {services.map((item) => (
            <View key={item.id} style={styles.card}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => router.push('/detail')}
              >
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  
                  {/* Botão Check Selecionável */}
                  <TouchableOpacity 
                    style={[styles.checkBadge, !item.selected && styles.checkBadgeInactive]}
                    onPress={() => toggleService(item.id)}
                  >
                    {item.selected && <Check color={colors.white} size={14} />}
                  </TouchableOpacity>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.timeBadge}>
                      <Clock color={colors.neutralGray || '#6B7280'} size={14} />
                      <Text style={styles.timeText}>{item.time} min</Text>
                    </View>
                    <Text style={styles.priceText}>R$ {item.price.toFixed(2).replace('.', ',')}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* Categorias */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorias</Text>
          <TouchableOpacity onPress={() => setShowAllCategories(!showAllCategories)}>
            <Text style={styles.seeAllText}>
              {showAllCategories ? 'Ver menos' : 'Ver todos'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoriesGrid}>
          {visibleCategories.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity key={item.id} style={styles.categoryCard}>
                <IconComponent color={colors.white} size={26} />
                <Text style={styles.categoryText}>{item.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Rodapé Dinâmico */}
      <View style={styles.cartFooterContainer}>
        <View>
          <Text style={styles.cartItemsText}>{totalItems} {totalItems === 1 ? 'item selecionado' : 'itens selecionados'}</Text>
          <Text style={styles.cartTotalText}>R$ {totalPrice.toFixed(2).replace('.', ',')} • {totalTime} min</Text>
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
  cardsScroll: { flexDirection: 'row', marginBottom: 16 },
  card: {
    width: 220,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageWrapper: { position: 'relative' },
  cardImage: { width: '100%', height: 120 },
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
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  cardDesc: { fontSize: 12, color: colors.neutralGray || '#6B7280', marginVertical: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, color: colors.neutralGray || '#6B7280' },
  priceText: { fontSize: 14, fontWeight: '700', color: colors.black || '#000' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryCard: {
    width: '23%',
    height: 90,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    marginTop: 4,
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