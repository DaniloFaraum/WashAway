import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Ícones
import { ArrowLeft, Clock, Star, Check, ShieldCheck, Heart } from 'lucide-react-native';

// Componentes do projeto
import Header from '@/components/Header';
import VehicleBar from '@/components/VehicleBar';

// Estilos e Cores centralizados
import { colors } from '@/constants/colors';

export default function ServiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Estados locais da tela
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>('padrao');

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />
      <VehicleBar />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Banner com Imagem e Botão de Voltar */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800',
            }}
            style={styles.bannerImage}
          />
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft color={colors.black || '#000'} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => setIsFavorite(!isFavorite)}
            activeOpacity={0.8}
          >
            <Heart
              color={isFavorite ? '#EF4444' : colors.black || '#000'}
              fill={isFavorite ? '#EF4444' : 'transparent'}
              size={20}
            />
          </TouchableOpacity>
        </View>

        {/* Informações Principais do Serviço */}
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.serviceTitle}>Lavagem Completa Premium</Text>
            <Text style={styles.servicePrice}>R$ 100,00</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Clock color={colors.neutralGray || '#6B7280'} size={14} />
              <Text style={styles.badgeText}>40 min</Text>
            </View>

            <View style={styles.badge}>
              <Star color="#FBBF24" fill="#FBBF24" size={14} />
              <Text style={styles.badgeText}>4.9 (128 avaliações)</Text>
            </View>
          </View>

          <Text style={styles.descriptionTitle}>Descrição do Serviço</Text>
          <Text style={styles.descriptionText}>
            Limpeza detalhada interna e externa do seu veículo. Utiliza produtos de alta performance
            com PH neutro, lavagem das caixas de roda, pretinho nos pneus e aspiração completa do interior.
          </Text>

          {/* O que está incluso */}
          <Text style={styles.sectionTitle}>O que está incluso</Text>
          <View style={styles.includedList}>
            {[
              'Lavagem externa com shampoo neutro',
              'Limpeza e hidratação das caixas de roda',
              'Aspiração do assoalho e porta-malas',
              'Higienização do painel e vidros',
              'Aplicação de cera líquida protetora',
            ].map((item, index) => (
              <View key={index} style={styles.includedItem}>
                <View style={styles.checkIcon}>
                  <Check color={colors.white} size={12} />
                </View>
                <Text style={styles.includedText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Opções Adicionais */}
          <Text style={styles.sectionTitle}>Opções do Serviço</Text>
          
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedOption === 'padrao' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedOption('padrao')}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Pacote Padrão</Text>
              <Text style={styles.optionSub}>Cera líquida protetora</Text>
            </View>
            <Text style={styles.optionPrice}>Incluso</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedOption === 'premium' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedOption('premium')}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Adicionar Cristalização</Text>
              <Text style={styles.optionSub}>Proteção da pintura por até 3 meses</Text>
            </View>
            <Text style={styles.optionPrice}>+ R$ 40,00</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Botão Fixo de Ação */}
      <View style={styles.footerContainer}>
        <View>
          <Text style={styles.footerLabel}>Valor Total</Text>
          <Text style={styles.footerPrice}>
            R$ {selectedOption === 'premium' ? '140,00' : '100,00'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/servicos')}
        >
          <Text style={styles.actionButtonText}>Confirmar Seleção</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: colors.white,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: colors.white,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  contentContainer: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.black || '#000',
    flex: 1,
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    color: colors.neutralGray || '#6B7280',
    fontWeight: '500',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black || '#000',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.neutralGray || '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black || '#000',
    marginBottom: 12,
    marginTop: 8,
  },
  includedList: {
    gap: 10,
    marginBottom: 20,
  },
  includedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  includedText: {
    fontSize: 14,
    color: colors.black || '#000',
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black || '#000',
  },
  optionSub: {
    fontSize: 12,
    color: colors.neutralGray || '#6B7280',
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  footerContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerLabel: {
    fontSize: 12,
    color: colors.neutralGray || '#6B7280',
  },
  footerPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.black || '#000',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});