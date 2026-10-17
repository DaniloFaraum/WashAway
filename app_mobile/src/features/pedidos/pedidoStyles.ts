import { StyleSheet } from 'react-native';

import { colors } from '@/constants/colors';

// Estilos compartilhados das telas do fluxo do pedido (I13): app/pedido/*.
export const pedidoStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16, paddingHorizontal: 20 },
  voltar: { padding: 4 },
  titulo: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.black },
  passo: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, fontSize: 13, color: colors.neutralGray },
  conteudo: { paddingHorizontal: 20, paddingBottom: 32, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  cartao: { backgroundColor: colors.white, borderRadius: 16, padding: 16, gap: 6, borderWidth: 1, borderColor: colors.border },
  cartaoSelecionado: { borderColor: colors.primary, borderWidth: 2 },
  secaoTitulo: { fontSize: 13, fontWeight: '700', color: colors.neutralGray, textTransform: 'uppercase' },
  texto: { fontSize: 15, color: colors.black },
  textoForte: { fontSize: 16, fontWeight: '700', color: colors.black },
  detalhe: { fontSize: 13, color: colors.neutralGray },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  erro: { color: colors.danger, fontSize: 14 },
  avisoErro: { backgroundColor: '#FEF2F2', borderColor: colors.danger, borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  rodape: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  botao: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  botaoDesabilitado: { opacity: 0.5 },
  botaoTexto: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
