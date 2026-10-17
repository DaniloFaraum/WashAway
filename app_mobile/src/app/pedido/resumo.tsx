import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { CabecalhoDoPasso, PedidoSemServicos } from '@/features/pedidos/CabecalhoDoPasso';
import { formatarDataHora } from '@/features/pedidos/dataHora';
import { pedidoStyles as base } from '@/features/pedidos/pedidoStyles';
import { montarPayloadPedido } from '@/features/pedidos/service/pedidos.model';
import { criarPedido, PedidoRecusadoError } from '@/features/pedidos/service/pedidos.service';
import { limparNovoPedido, totaisDoPedido, useNovoPedido } from '@/features/pedidos/useNovoPedido';
import { limparServicosSelecionados } from '@/features/servicos/servicosSelecionados';
import { formatarPlaca } from '@/features/veiculos/placa';
import { formatarDuracao } from '@/utils/formatarDuracao';
import { formatarPreco } from '@/utils/formatarPreco';

type Erro = { mensagem: string; codigo: string | null };

// Passo 3 do pedido (I13): resumo + "Confirmar pedido". Duração e total aqui são
// só para exibir (o backend recalcula a partir dos ids). O botão fica
// desabilitado durante o envio (e uma trava síncrona evita o toque duplo); em
// erro, a mensagem aparece e nada do que foi escolhido se perde.
export default function PedidoResumoScreen() {
  const router = useRouter();
  const { lavaRapido, servicos, veiculo, horario } = useNovoPedido();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<Erro | null>(null);
  const enviandoRef = useRef(false);

  if (!lavaRapido || servicos.length === 0 || !veiculo || !horario) {
    return (
      <SafeAreaView style={base.container}>
        <CabecalhoDoPasso titulo="Resumo" />
        <PedidoSemServicos />
      </SafeAreaView>
    );
  }

  const { precoTotal, duracaoMinutos } = totaisDoPedido(servicos);

  function alterarServicos() {
    router.dismissTo({ pathname: '/servicos', params: { id: lavaRapido!.id, nome: lavaRapido!.nome } });
  }
  function alterarVeiculo() {
    router.dismissTo('/pedido/veiculo');
  }
  function alterarHorario() {
    router.dismissTo('/pedido/data-hora');
  }

  async function confirmar() {
    if (enviandoRef.current) return;
    if (new Date(horario!).getTime() <= Date.now()) {
      setErro({ mensagem: 'Esse horário já passou. Escolha outra data e hora.', codigo: 'HORARIO_PASSADO' });
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErro(null);
    try {
      const pedido = await criarPedido(
        montarPayloadPedido({ lavaRapidoId: lavaRapido!.id, veiculoId: veiculo!.id, servicos, horario: horario! }),
      );
      router.replace({ pathname: '/pedido/enviado', params: { nome: lavaRapido!.nome, horario: pedido.horario } });
      // Pedido feito: o carrinho e o fluxo recomeçam vazios.
      limparServicosSelecionados();
      limparNovoPedido();
    } catch (err) {
      setErro({
        mensagem: err instanceof Error ? err.message : 'Não foi possível enviar o pedido agora. Tente de novo.',
        codigo: err instanceof PedidoRecusadoError ? err.codigo : null,
      });
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={base.container}>
      <CabecalhoDoPasso titulo="Resumo do pedido" passo={3} />
      <ScrollView contentContainerStyle={base.conteudo}>
        <View style={base.cartao}>
          <Text style={base.secaoTitulo}>Lava-rápido</Text>
          <Text style={base.textoForte}>{lavaRapido.nome}</Text>
          {lavaRapido.endereco ? <Text style={base.detalhe}>{lavaRapido.endereco}</Text> : null}
        </View>

        <View style={base.cartao}>
          <View style={base.linha}>
            <Text style={base.secaoTitulo}>Serviços</Text>
            <Pressable accessibilityRole="button" onPress={alterarServicos} disabled={enviando}>
              <Text style={base.link}>Alterar</Text>
            </Pressable>
          </View>
          {servicos.map((servico) => (
            <View key={servico.id} style={base.linha}>
              <Text style={[base.texto, { flex: 1 }]}>{servico.nome}</Text>
              <Text style={base.texto}>{formatarPreco(servico.preco)}</Text>
            </View>
          ))}
        </View>

        <View style={base.cartao}>
          <View style={base.linha}>
            <Text style={base.secaoTitulo}>Veículo</Text>
            <Pressable accessibilityRole="button" onPress={alterarVeiculo} disabled={enviando}>
              <Text style={base.link}>Alterar</Text>
            </Pressable>
          </View>
          <Text style={base.texto}>
            {veiculo.marca ? `${veiculo.marca} ${veiculo.modelo}` : veiculo.modelo} · {veiculo.cor} · {formatarPlaca(veiculo.placa)}
          </Text>
        </View>

        <View style={base.cartao}>
          <View style={base.linha}>
            <Text style={base.secaoTitulo}>Data e hora</Text>
            <Pressable accessibilityRole="button" onPress={alterarHorario} disabled={enviando}>
              <Text style={base.link}>Alterar</Text>
            </Pressable>
          </View>
          <Text style={base.texto}>{formatarDataHora(horario)}</Text>
          <Text style={base.detalhe}>Duração estimada: ~{formatarDuracao(duracaoMinutos)}</Text>
        </View>

        <View style={[base.cartao, base.linha]}>
          <Text style={base.textoForte}>Total</Text>
          <Text style={base.textoForte}>{formatarPreco(precoTotal)}</Text>
        </View>

        {erro && (
          <View style={base.avisoErro} accessibilityRole="alert">
            <Text style={base.erro}>{erro.mensagem}</Text>
            {erro.codigo === 'HORARIO_PASSADO' && (
              <Pressable accessibilityRole="button" onPress={alterarHorario}>
                <Text style={base.link}>Escolher outro horário</Text>
              </Pressable>
            )}
            {erro.codigo === 'SERVICO_INVALIDO' && (
              <Pressable accessibilityRole="button" onPress={alterarServicos}>
                <Text style={base.link}>Escolher os serviços de novo</Text>
              </Pressable>
            )}
            {erro.codigo === 'VEICULO_NAO_ENCONTRADO' && (
              <Pressable accessibilityRole="button" onPress={alterarVeiculo}>
                <Text style={base.link}>Escolher outro veículo</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <View style={base.rodape}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: enviando, busy: enviando }}
          disabled={enviando}
          onPress={() => void confirmar()}
          style={[base.botao, enviando && base.botaoDesabilitado]}>
          {enviando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={base.botaoTexto}>{erro ? 'Tentar de novo' : 'Confirmar pedido'}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
