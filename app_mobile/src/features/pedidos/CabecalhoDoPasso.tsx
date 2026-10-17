import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { pedidoStyles as base } from './pedidoStyles';

/** Topo das telas do fluxo do pedido (I13): voltar, título e "Passo N de 3". */
export function CabecalhoDoPasso({ titulo, passo }: { titulo: string; passo?: number }) {
  const router = useRouter();

  /** Aberta direto (link/refresh no web), sem tela anterior: vai para a Home. */
  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <>
      <View style={base.topo}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={voltar} style={base.voltar}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={base.titulo}>{titulo}</Text>
      </View>
      <Text style={base.passo}>{passo ? `Passo ${passo} de 3` : ' '}</Text>
    </>
  );
}

/** O fluxo foi aberto sem serviços escolhidos (ex.: refresh no web): volta ao início. */
export function PedidoSemServicos() {
  const router = useRouter();
  return (
    <View style={base.conteudo}>
      <View style={base.cartao}>
        <Text style={base.texto}>Escolha um lava-rápido e os serviços para começar o pedido.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')}>
          <Text style={base.link}>Ver lava-rápidos</Text>
        </Pressable>
      </View>
    </View>
  );
}
