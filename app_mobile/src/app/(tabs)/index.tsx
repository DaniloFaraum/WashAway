import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CarWashCard } from '@/components/CarWashCard';
import { colors } from '@/constants/colors';

let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

type ActiveTab = 'lista' | 'mapa';
type ActiveFilter = 'aberto' | 'avaliacao' | 'distancia' | null;

function parseDistance(distance: string) {
  return parseFloat(distance.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
}

const mockData = [
  {
    id: '1',
    name: 'Aqua Shine Lava-Rápido',
    rating: 4.8,
    reviewsCount: 124,
    distance: '1.2 km',
    time: '5 min',
    price: 45,
    isOpen: true,
    image: require('../../../assets/images/lava1.jpg'),
    latitude: -23.5505,
    longitude: -46.6333,
  },
  {
    id: '2',
    name: 'Lava Rápido Centro',
    rating: 4.5,
    reviewsCount: 89,
    distance: '2.4 km',
    time: '8 min',
    price: 39,
    isOpen: true,
    image: require('../../../assets/images/lava2.jpg'),
    latitude: -23.5506,
    longitude: -46.6341,
  },
  {
    id: '3',
    name: 'Super Wash Express',
    rating: 4.2,
    reviewsCount: 56,
    distance: '3.1 km',
    time: '12 min',
    price: 55,
    isOpen: false,
    image: require('../../../assets/images/lava3.jpg'),
    latitude: -23.5498,
    longitude: -46.6324,
  },
  {
    id: '4',
    name: 'Brilho Total Premium',
    rating: 5.0,
    reviewsCount: 208,
    distance: '0.7 km',
    time: '3 min',
    price: 69,
    isOpen: true,
    image: require('../../../assets/images/lava1.jpg'),
    latitude: -23.5513,
    longitude: -46.6329,
  },
  {
    id: '5',
    name: 'Crystal Jet Wash',
    rating: 4.6,
    reviewsCount: 141,
    distance: '4.8 km',
    time: '16 min',
    price: 42,
    isOpen: false,
    image: require('../../../assets/images/lava2.jpg'),
    latitude: -23.5492,
    longitude: -46.6348,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('lista');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentAddress, setCurrentAddress] = useState('Buscando localização...');
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [typedAddress, setTypedAddress] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -23.5505,
    longitude: -46.6333,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    async function loadCurrentAddress() {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setCurrentAddress('Localização negada');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        let address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        const place = address[0];
        if (!place) {
          setCurrentAddress('Endereço não encontrado');
          return;
        }

        if (place.street && place.streetNumber) {
          setCurrentAddress(`${place.street}, ${place.streetNumber}`);
        } else if (place.street) {
          setCurrentAddress(place.street);
        } else {
          setCurrentAddress(place.name ?? 'Endereço não encontrado');
        }
      } catch {
        setCurrentAddress('Localização indisponível');
      }
    }

    loadCurrentAddress();
  }, []);

  async function handleManualAddressChange() {
    const query = typedAddress.trim();
    if (!query) {
      return;
    }

    const geocodeResult = await Location.geocodeAsync(query);

    if (geocodeResult.length > 0) {
      setMapRegion({
        latitude: geocodeResult[0].latitude,
        longitude: geocodeResult[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }

    setCurrentAddress(query);
    setIsAddressModalVisible(false);
    setTypedAddress('');
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>
        WASH <Text style={styles.titleAccent}>YOUR</Text> WAY
      </Text>

      <Pressable
        style={styles.locationButton}
        accessibilityRole="button"
        accessibilityLabel="Alterar localização"
        onPress={() => {
          setTypedAddress('');
          setIsAddressModalVisible(true);
        }}>
        <Text style={styles.locationText} numberOfLines={1}>
          📍 {currentAddress} ▾
        </Text>
      </Pressable>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={colors.neutralGray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar lava-rápido..."
          placeholderTextColor={colors.neutralGray}
          accessibilityLabel="Buscar lava-rápido"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable
          style={styles.filterButton}
          accessibilityRole="button"
          accessibilityLabel="Filtros"
          onPress={() => setIsFilterModalVisible(true)}>
          <Ionicons name="options-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.toggleContainer}>
        <Pressable
          style={[styles.toggleButton, activeTab === 'lista' && styles.toggleButtonActive]}
          onPress={() => setActiveTab('lista')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'lista' }}>
          <Text style={[styles.toggleText, activeTab === 'lista' && styles.toggleTextActive]}>
            LISTA
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, activeTab === 'mapa' && styles.toggleButtonActive]}
          onPress={() => setActiveTab('mapa')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'mapa' }}>
          <Text style={[styles.toggleText, activeTab === 'mapa' && styles.toggleTextActive]}>
            MAPA
          </Text>
        </Pressable>
      </View>
    </View>
  );

  let result = mockData.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (activeFilter === 'aberto') {
    result = result.filter((item) => item.isOpen === true);
  }

  if (activeFilter === 'avaliacao') {
    result = result.sort((a, b) => b.rating - a.rating);
  }

  if (activeFilter === 'distancia') {
    result = result.sort(
      (a, b) => parseDistance(a.distance) - parseDistance(b.distance),
    );
  }

  const filteredData = result;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {header}
      {activeTab === 'lista' ? (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <CarWashCard
              id={item.id}
              name={item.name}
              rating={item.rating}
              reviewsCount={item.reviewsCount}
              distance={item.distance}
              time={item.time}
              price={item.price}
              isOpen={item.isOpen}
              image={item.image}
              rank={index + 1}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          style={styles.list}
        />
      ) : Platform.OS === 'web' ? (
        <View style={styles.mapUnavailable}>
          <Text style={styles.mapUnavailableText}>
            O mapa nativo está disponível apenas no aplicativo móvel.
          </Text>
        </View>
      ) : (
        <MapView style={styles.map} region={mapRegion} showsUserLocation={true}>
          {filteredData.map((item) => (
            <Marker
              key={item.id}
              identifier={item.id}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              title={item.name}
              description={`A partir de R$ ${item.price.toFixed(2).replace('.', ',')}`}
              onPress={() =>
                router.push({
                  pathname: '/servicos',
                  params: { id: item.id, nome: item.name },
                })
              }
            />
          ))}
        </MapView>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddressModalVisible}
        onRequestClose={() => setIsAddressModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
              setIsAddressModalVisible(false);
            }}>
            <View
              style={[styles.modalOverlay, styles.modalBackdrop]}
              accessibilityRole="button"
              accessibilityLabel="Fechar modal"
            />
          </TouchableWithoutFeedback>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Alterar Localização</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Digite o novo endereço"
              placeholderTextColor={colors.neutralGray}
              value={typedAddress}
              onChangeText={setTypedAddress}
              accessibilityLabel="Novo endereço"
            />
            <Pressable
              style={styles.confirmButton}
              accessibilityRole="button"
              onPress={handleManualAddressChange}>
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setIsFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsFilterModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar filtros"
          />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Filtrar por:</Text>
            <View style={styles.filterChips}>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'aberto' && styles.filterChipActive]}
                onPress={() => {
                  setActiveFilter('aberto');
                  setIsFilterModalVisible(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilter === 'aberto' }}>
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'aberto' && styles.filterChipTextActive,
                  ]}>
                  Aberto Agora
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'avaliacao' && styles.filterChipActive]}
                onPress={() => {
                  setActiveFilter('avaliacao');
                  setIsFilterModalVisible(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilter === 'avaliacao' }}>
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'avaliacao' && styles.filterChipTextActive,
                  ]}>
                  Melhor Avaliado
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'distancia' && styles.filterChipActive]}
                onPress={() => {
                  setActiveFilter('distancia');
                  setIsFilterModalVisible(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilter === 'distancia' }}>
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'distancia' && styles.filterChipTextActive,
                  ]}>
                  Mais Próximo
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setIsFilterModalVisible(false)}
              accessibilityRole="button">
              <Text style={styles.confirmButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setActiveFilter(null);
                setIsFilterModalVisible(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Limpar filtros">
              <Text style={styles.clearFiltersText}>Limpar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 72 : 8,
    paddingBottom: 4,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2.4,
    textAlign: 'center',
    color: colors.black,
  },
  titleAccent: {
    color: colors.primary,
  },
  locationButton: {
    alignSelf: 'center',
    maxWidth: '90%',
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  locationText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.black,
    paddingVertical: 12,
  },
  filterButton: {
    padding: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: 4,
    marginTop: 4,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  toggleTextActive: {
    color: colors.white,
  },
  list: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  mapUnavailable: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mapUnavailableText: {
    color: colors.neutralGray,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
    flexGrow: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.black,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  clearFiltersText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 4,
  },
});
