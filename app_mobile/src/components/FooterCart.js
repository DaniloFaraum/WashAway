import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/colors';

export default function FooterCart({ itemCount = 2, totalTime = 70, totalPrice = 180.00 }) {
  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          Total itens: {itemCount}  |  Tempo total: {totalTime} min
        </Text>
        <Text style={styles.priceText}>
          R$: {totalPrice.toFixed(2).replace('.', ',')}
        </Text>
      </View>
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.buttonText}>Agendar horário</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: { fontFamily: 'AlbertSans-Regular', fontSize: 13, color: colors.textGray },
  priceText: { fontFamily: 'Poppins-Bold', fontSize: 18, color: colors.primary },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { fontFamily: 'Poppins-Bold', color: colors.white, fontSize: 16 },
});