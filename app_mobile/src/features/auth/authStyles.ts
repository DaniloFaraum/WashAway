import { StyleSheet } from 'react-native';

import { colors } from '@/constants/colors';

// Estilos compartilhados das telas de conta (login e cadastro).
export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  conteudo: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  titulo: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2.4,
    textAlign: 'center',
    color: colors.black,
  },
  tituloDestaque: {
    color: colors.primary,
  },
  subtitulo: {
    fontSize: 16,
    color: colors.neutralGray,
    textAlign: 'center',
  },
  formulario: {
    gap: 14,
  },
  aviso: {
    backgroundColor: colors.white,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    color: colors.black,
    fontSize: 14,
  },
  erro: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  sucesso: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  botao: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  botaoSecundario: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botaoSecundarioTexto: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  rodape: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  rodapeTexto: {
    color: colors.neutralGray,
    fontSize: 14,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
