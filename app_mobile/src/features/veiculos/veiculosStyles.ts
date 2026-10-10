import { StyleSheet } from 'react-native';

import { colors } from '@/constants/colors';

// Estilos compartilhados das telas "Meus veículos" e do formulário de veículo (I3).
export const veiculosStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  voltar: {
    padding: 4,
  },
  titulo: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.black,
  },
  conteudo: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  cartao: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  erro: {
    color: colors.danger,
    fontSize: 14,
  },
  botao: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
