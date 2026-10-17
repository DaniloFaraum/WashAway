import { StyleSheet, Text, View } from 'react-native';

import { estiloDoStatus } from './statusPedido';

/** Selo de status do pedido (I18): lista de "Meus pedidos" e detalhe. */
export function SeloStatus({ status }: { status: string }) {
  const estilo = estiloDoStatus(status);
  return (
    <View style={[styles.selo, { backgroundColor: estilo.fundo, borderColor: estilo.cor }]}>
      <Text style={[styles.texto, { color: estilo.cor }]}>{estilo.rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  texto: {
    fontSize: 12,
    fontWeight: '700',
  },
});
