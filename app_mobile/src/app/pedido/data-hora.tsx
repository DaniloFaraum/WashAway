import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeletorDataHora, type ValorDataHora } from '@/components/SeletorDataHora';
import { useIntercorrencias } from '@/features/intercorrencias/useIntercorrencias';
import { useLavaRapido } from '@/features/lava-rapidos/useLavaRapido';
import { CabecalhoDoPasso, PedidoSemServicos } from '@/features/pedidos/CabecalhoDoPasso';
import { isNoFuturo, montarHorarioIso, separarHorarioIso } from '@/features/pedidos/dataHora';
import { avisosDeFechamentoNoDia, textoHorarioNoDia } from '@/features/pedidos/horarioDoDia';
import { pedidoStyles as base } from '@/features/pedidos/pedidoStyles';
import { useNovoPedido } from '@/features/pedidos/useNovoPedido';

// Passo 2 do pedido (I13): dia + horário (SeletorDataHora). Datas e horários no
// passado não são aceitos. Vem pré-preenchido com o que já foi escolhido (ou
// com a data/hora da busca do I9, via `iniciarNovoPedido`).
// I20: abaixo dos dias, o horário de funcionamento e os fechamentos do dia
// escolhido (só informa; quem recusa é o backend). Se o backend recusou o
// horário, o cliente volta aqui com ele ainda escolhido e destacado com a mensagem.
export default function PedidoDataHoraScreen() {
  const router = useRouter();
  const { lavaRapido, servicos, veiculo, horario, erroHorario, escolherHorario } = useNovoPedido();
  const { lavaRapido: detalhe } = useLavaRapido(lavaRapido?.id);
  const { intercorrencias } = useIntercorrencias(lavaRapido?.id);

  const [valor, setValor] = useState<ValorDataHora>(() => {
    const anterior = horario ? separarHorarioIso(horario) : null;
    return anterior && isNoFuturo(anterior.data, anterior.hora, new Date()) ? anterior : { data: null, hora: null };
  });

  const completo = Boolean(valor.data && valor.hora && isNoFuturo(valor.data, valor.hora, new Date()));
  // O destaque vale só enquanto o horário na tela for o mesmo que o backend recusou.
  const recusado = Boolean(
    erroHorario && horario && valor.data && valor.hora && montarHorarioIso(valor.data, valor.hora) === horario,
  );
  const textoDoDia = valor.data ? textoHorarioNoDia(detalhe?.horarios ?? [], valor.data) : null;
  const avisosDoDia = valor.data ? avisosDeFechamentoNoDia(intercorrencias, valor.data) : [];

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
        {recusado && (
          <View style={base.avisoErro} accessibilityRole="alert">
            <Text style={base.erro}>{erroHorario}</Text>
            <Text style={base.detalhe}>Escolha outro dia ou horário.</Text>
          </View>
        )}
        <SeletorDataHora
          valor={valor}
          onChange={setValor}
          rodapeDoDia={
            textoDoDia || avisosDoDia.length > 0 ? (
              <View style={{ gap: 2 }}>
                {textoDoDia ? <Text style={base.detalhe}>{textoDoDia}</Text> : null}
                {avisosDoDia.map((aviso) => (
                  <Text key={aviso} style={base.erro}>
                    {aviso}
                  </Text>
                ))}
              </View>
            ) : null
          }
        />
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
