import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarOff, Clock } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { useIntercorrencias } from '@/features/intercorrencias/useIntercorrencias';
import { formatarDataBR } from '@/features/intercorrencias/formatarData';

export default function DisponibilidadeScreen() {
  const router = useRouter();
  const { id, nome } = useLocalSearchParams<{ id?: string; nome?: string }>();

  const { intercorrencias, loading, error } = useIntercorrencias(id);
  const ordenadas = [...intercorrencias].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={colors.black} size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Disponibilidade</Text>
          <Text style={styles.subtitle}>{nome || 'Lava-rápido'}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
        {error && <Text style={styles.errorText}>Não foi possível carregar a disponibilidade.</Text>}
        {!loading && !error && ordenadas.length === 0 && (
          <View style={styles.emptyState}>
            <CalendarOff color={colors.neutralGray} size={32} />
            <Text style={styles.emptyText}>Nenhuma indisponibilidade registrada.</Text>
          </View>
        )}

        {ordenadas.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardData}>{formatarDataBR(item.data)}</Text>
            <Text style={styles.cardMotivo}>{item.motivo}</Text>
            <View style={styles.cardHorario}>
              <Clock color={colors.neutralGray} size={14} />
              <Text style={styles.cardHorarioText}>
                {item.diaInteiro ? 'Dia inteiro' : `${item.horaInicio} – ${item.horaFim}`}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: colors.black },
  subtitle: { fontSize: 13, color: colors.neutralGray },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  errorText: { color: colors.danger, marginTop: 24 },
  emptyState: { alignItems: 'center', gap: 8, marginTop: 48 },
  emptyText: { color: colors.neutralGray, fontSize: 14 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  cardData: { fontSize: 13, fontWeight: '700', color: colors.primary },
  cardMotivo: { fontSize: 15, fontWeight: '600', color: colors.black, marginVertical: 4 },
  cardHorario: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardHorarioText: { fontSize: 12, color: colors.neutralGray },
});
