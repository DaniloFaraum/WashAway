import { useFonts, Viga_400Regular } from '@expo-google-fonts/viga';
import * as SplashScreen from 'expo-splash-screen';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { MenuConta } from '@/components/MenuConta';
import { SeletorDataHora, type ValorDataHora } from '@/components/SeletorDataHora';
import { colors } from '@/constants/colors';
import { centeredStyle } from '@/constants/commonStyles';
import { formatarPrecoAPartirDe } from '@/features/lava-rapidos/formatarPrecoAPartirDe';
import { useLavaRapidos } from '@/features/lava-rapidos/useLavaRapidos';
import { validarHorarioBusca } from '@/features/lava-rapidos/validarHorarioBusca';
import { formatarDataHora, montarHorarioIso, separarHorarioIso } from '@/features/pedidos/dataHora';

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

export default function HomeScreen() {
  const router = useRouter();
  // Busca por horário (I9): ISO com offset do negócio; com ele, o backend
  // devolve só os lava-rápidos abertos naquele instante (lista e mapa).
  const [horarioBusca, setHorarioBusca] = useState<string | null>(null);
  const [isHorarioModalVisible, setIsHorarioModalVisible] = useState(false);
  const [valorHorario, setValorHorario] = useState<ValorDataHora>({ data: null, hora: null });
  const { lavaRapidos, loading: loadingLavaRapidos, error: lavaRapidosError } = useLavaRapidos(horarioBusca);

  const [fontsLoaded] = useFonts({
    Viga_400Regular,
  });

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

  if (!fontsLoaded) {
    return null; // ou um indicador de carregamento
  }

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

  function abrirModalHorario() {
    setValorHorario((horarioBusca && separarHorarioIso(horarioBusca)) || { data: null, hora: null });
    setIsHorarioModalVisible(true);
  }

  const horarioEscolhido =
    valorHorario.data && valorHorario.hora ? montarHorarioIso(valorHorario.data, valorHorario.hora) : null;
  const erroHorarioEscolhido = horarioEscolhido
    ? validarHorarioBusca(new Date(horarioEscolhido), new Date())
    : null;

  function aplicarHorario() {
    if (!horarioEscolhido || validarHorarioBusca(new Date(horarioEscolhido), new Date())) return;
    setHorarioBusca(horarioEscolhido);
    setIsHorarioModalVisible(false);
  }

  function limparHorario() {
    setHorarioBusca(null);
    setValorHorario({ data: null, hora: null });
    setIsHorarioModalVisible(false);
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>
        WASH <Text style={styles.titleAccent}>YOUR</Text> WAY
      </Text>

      <View style={styles.locationRow}>
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

        <MenuConta />
      </View>

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

      <View style={styles.horarioRow}>
        <Pressable
          style={[styles.horarioChip, horarioBusca && styles.horarioChipAtivo]}
          accessibilityRole="button"
          accessibilityLabel={horarioBusca ? `Horário da busca: ${formatarDataHora(horarioBusca)}. Mudar horário` : 'Quando? Escolher data e hora'}
          onPress={abrirModalHorario}>
          <Ionicons name="time-outline" size={18} color={horarioBusca ? colors.white : colors.primary} />
          <Text style={[styles.horarioChipText, horarioBusca && styles.horarioChipTextAtivo]} numberOfLines={1}>
            {horarioBusca ? formatarDataHora(horarioBusca) : 'Quando?'}
          </Text>
        </Pressable>
        {horarioBusca && (
          <Pressable
            style={styles.horarioLimpar}
            accessibilityRole="button"
            accessibilityLabel="Limpar horário"
            onPress={limparHorario}>
            <Ionicons name="close" size={18} color={colors.primary} />
          </Pressable>
        )}
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

  // Sem horário: carregamento/erro em tela cheia, como antes. Com horário (I9),
  // o cabeçalho continua visível para o cliente mudar ou limpar o horário.
  if (loadingLavaRapidos && !horarioBusca) {
    return (
      <SafeAreaView style={[styles.container, centeredStyle]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (lavaRapidosError && !horarioBusca) {
    return (
      <SafeAreaView style={[styles.container, centeredStyle]}>
        <Text style={styles.mapUnavailableText}>
          Não foi possível carregar os lava-rápidos: {lavaRapidosError}
        </Text>
      </SafeAreaView>
    );
  }

  let result = lavaRapidos.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // "Aberto Agora" não se aplica com horário escolhido (I9): a lista já vem
  // filtrada pelo horário buscado.
  if (activeFilter === 'aberto' && !horarioBusca) {
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

  const acoesHorario = (
    <View style={styles.vazioAcoes}>
      <Pressable style={styles.vazioBotao} accessibilityRole="button" onPress={abrirModalHorario}>
        <Text style={styles.vazioBotaoTexto}>Mudar horário</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Limpar horário da busca" onPress={limparHorario}>
        <Text style={styles.clearFiltersText}>Limpar horário</Text>
      </Pressable>
    </View>
  );

  // Estado da busca por horário que substitui a lista/o mapa (I9): carregando,
  // erro (ex.: o horário passou com o app aberto) ou nenhum disponível.
  const avisoHorario = !horarioBusca ? null : loadingLavaRapidos ? (
    <View style={styles.vazio}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  ) : lavaRapidosError ? (
    <View style={styles.vazio}>
      <Text style={styles.mapUnavailableText}>
        Não foi possível buscar os lava-rápidos neste horário: {lavaRapidosError}
      </Text>
      {acoesHorario}
    </View>
  ) : lavaRapidos.length === 0 ? (
    <View style={styles.vazio}>
      <Text style={styles.mapUnavailableText}>Nenhum lava-rápido disponível neste horário</Text>
      {acoesHorario}
    </View>
  ) : null;

  const listaVazia = (
    <View style={styles.vazio}>
      <Text style={styles.mapUnavailableText}>Nenhum lava-rápido encontrado</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {header}
      {avisoHorario ? (
        avisoHorario
      ) : activeTab === 'lista' ? (
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
              horario={horarioBusca}
            />
          )}
          ListEmptyComponent={listaVazia}
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
              description={formatarPrecoAPartirDe(item.price)}
              onPress={() =>
                router.push({
                  pathname: '/servicos',
                  params: horarioBusca
                    ? { id: item.id, nome: item.name, horario: horarioBusca }
                    : { id: item.id, nome: item.name },
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
              {!horarioBusca && (
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
              )}
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={isHorarioModalVisible}
        onRequestClose={() => setIsHorarioModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsHorarioModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar escolha de horário"
          />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Quando você quer lavar?</Text>
            <Text style={styles.horarioDica}>Mostramos só os lava-rápidos abertos no horário (de Brasília).</Text>
            <SeletorDataHora valor={valorHorario} onChange={setValorHorario} />
            {erroHorarioEscolhido && <Text style={styles.horarioErro}>{erroHorarioEscolhido}</Text>}
            <Pressable
              style={[styles.confirmButton, (!horarioEscolhido || erroHorarioEscolhido) && styles.confirmButtonDisabled]}
              disabled={!horarioEscolhido || Boolean(erroHorarioEscolhido)}
              accessibilityRole="button"
              accessibilityState={{ disabled: !horarioEscolhido || Boolean(erroHorarioEscolhido) }}
              onPress={aplicarHorario}>
              <Text style={styles.confirmButtonText}>Aplicar</Text>
            </Pressable>
            <TouchableOpacity onPress={limparHorario} accessibilityRole="button" accessibilityLabel="Limpar horário">
              <Text style={styles.clearFiltersText}>Limpar horário</Text>
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
    fontFamily: 'Viga_400Regular',  
  },
  titleAccent: {
    color: colors.primary,
    fontFamily: 'Viga_400Regular',
  },
  locationRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    maxWidth: '90%',
    gap: 8,
  },
  locationButton: {
    flexShrink: 1,
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
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  horarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  horarioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  horarioChipAtivo: {
    backgroundColor: colors.primary,
  },
  horarioChipText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  horarioChipTextAtivo: {
    color: colors.white,
  },
  horarioLimpar: {
    padding: 6,
  },
  horarioDica: {
    fontSize: 13,
    color: colors.neutralGray,
    textAlign: 'center',
  },
  horarioErro: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  vazioAcoes: {
    alignItems: 'center',
    gap: 8,
  },
  vazioBotao: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  vazioBotaoTexto: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
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
