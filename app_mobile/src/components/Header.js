import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Bell, Menu } from 'lucide-react-native';
import { colors } from '@/constants/colors';

export default function Header() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.logoText}>Logo</Text>
        <View style={styles.iconContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <Bell color={colors.white} size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Menu color={colors.white} size={24} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.primary },
  container: {
    height: 60,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: colors.white,
  },
  iconContainer: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 4 },
});