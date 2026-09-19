import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Car } from 'lucide-react-native';
//import { colors } from '../styles/colors';
import { colors } from '@/constants/colors';

export default function VehicleBar() {
  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Car color={colors.primary} size={22} />
        <View style={styles.textWrapper}>
          <Text style={styles.label}>Seu carro selecionado:</Text>
          <Text style={styles.carName}>Honda Civic – 2016</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Trocar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EBF3FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  infoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textWrapper: { flexDirection: 'column' },
  label: { fontFamily: 'AlbertSans-Regular', fontSize: 12, color: colors.textGray },
  carName: { fontFamily: 'Poppins-Bold', fontSize: 14, color: colors.textDark },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonText: { fontFamily: 'Poppins-Medium', color: colors.white, fontSize: 13 },
});