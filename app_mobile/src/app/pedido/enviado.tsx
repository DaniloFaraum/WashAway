import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { formatarDataHora } from '@/features/pedidos/dataHora';
import { pedidoStyles as base } from '@/features/pedidos/pedidoStyles';

// Fim do fluxo do pedido (I13): o pedido foi criado como "pendente" e aguarda o
// lava-rápido (aceite/recusa é o I15; "Meus pedidos" é o I18).
export default function PedidoEnviadoScreen() {
  const router = useRouter();
  const { nome, horario } = useLocalSearchParams<{ nome?: string; horario?: string }>();
  const quando = horario ? formatarDataHora(horario) : '';

  return (
    <SafeAreaView style={base.container}>
      <View style={[base.conteudo, { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }]}>
        <Ionicons name="checkmark-circle" size={72} color={colors.primary} />
        <Text style={[base.titulo, { flex: 0, textAlign: 'center' }]}>Pedido enviado</Text>
        <Text style={[base.texto, { textAlign: 'center' }]}>Aguardando confirmação do lava-rápido.</Text>
        {(nome || quando) && (
          <Text style={[base.detalhe, { textAlign: 'center' }]}>
            {[nome, quando].filter(Boolean).join(' · ')}
          </Text>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.dismissTo('/')} style={[base.botao, { alignSelf: 'stretch' }]}>
          <Text style={base.botaoTexto}>Voltar ao início</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
