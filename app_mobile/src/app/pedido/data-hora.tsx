import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeletorDataHora, type ValorDataHora } from '@/components/SeletorDataHora';
import { CabecalhoDoPasso, PedidoSemServicos } from '@/features/pedidos/CabecalhoDoPasso';
import { isNoFuturo, montarHorarioIso, separarHorarioIso } from '@/features/pedidos/dataHora';
import { pedidoStyles as base } from '@/features/pedidos/pedidoStyles';
import { useNovoPedido } from '@/features/pedidos/useNovoPedido';

// Passo 2 do pedido (I13): dia + horário (SeletorDataHora). Datas e horários no
// passado não são aceitos. Vem pré-preenchido com o que já foi escolhido (ou
// com a data/hora da busca do I9, via `iniciarNovoPedido`).
export default function PedidoDataHoraScreen() {
  const router = useRouter();
  const { lavaRapido, servicos, veiculo, horario, escolherHorario } = useNovoPedido();

  const [valor, setValor] = useState<ValorDataHora>(() => {
    const anterior = horario ? separarHorarioIso(horario) : null;
    return anterior && isNoFuturo(anterior.data, anterior.hora, new Date()) ? anterior : { data: null, hora: null };
  });

  const completo = Boolean(valor.data && valor.hora && isNoFuturo(valor.data, valor.hora, new Date()));

  function continuar() {
    if (!valor.data || !valor.hora || !isNoFuturo(valor.data, valor.hora, new Date())) return;
    escolherHorario(montarHorarioIso(valor.data, valor.hora));
    router.push('/pedido/resumo');
  }

  if (!lavaRapido || servicos.length === 0 || !veiculo) {
    return (
      <SafeAreaView style={base.container}>
        <CabecalhoDoPasso titulo="Data e hora" />
        <PedidoSemServicos />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={base.container}>
      <CabecalhoDoPasso titulo="Quando?" passo={2} />
      <ScrollView contentContainerStyle={base.conteudo}>
        <Text style={base.detalhe}>Horários de Brasília. O lava-rápido confirma o pedido depois.</Text>
        <SeletorDataHora valor={valor} onChange={setValor} />
      </ScrollView>
      <View style={base.rodape}>
        <Pressable
          accessibilityRole="button"
          disabled={!completo}
          onPress={continuar}
          style={[base.botao, !completo && base.botaoDesabilitado]}>
          <Text style={base.botaoTexto}>Ver resumo</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
