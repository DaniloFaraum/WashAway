import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampoFormulario } from '@/components/CampoFormulario';
import { colors } from '@/constants/colors';
import { formatarPlaca } from '@/features/veiculos/placa';
import type { DadosVeiculo } from '@/features/veiculos/service/veiculos.model';
import {
  atualizarVeiculo,
  criarVeiculo,
  ErroRede,
  ErroValidacaoVeiculo,
  PlacaJaCadastradaError,
  VeiculoNaoEncontradoError,
} from '@/features/veiculos/service/veiculos.service';
import { validarVeiculo, type ErrosVeiculo } from '@/features/veiculos/validarVeiculo';
import { veiculosStyles as base } from '@/features/veiculos/veiculosStyles';

// Formulário de criar/editar veículo (I3). Com `id` nos params é edição (os
// demais params trazem os valores atuais). `voltarPara` (atalho do I13: "sem
// veículo, cadastrar e voltar") define para onde ir depois de salvar; sem ele,
// volta para a tela anterior.

type Params = {
  id?: string;
  marca?: string;
  modelo?: string;
  cor?: string;
  placa?: string;
  voltarPara?: string;
};

export default function FormVeiculoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const editando = Boolean(params.id);

  const [form, setForm] = useState<DadosVeiculo>({
    marca: params.marca ?? '',
    modelo: params.modelo ?? '',
    cor: params.cor ?? '',
    placa: params.placa ? formatarPlaca(params.placa) : '',
  });
  const [erros, setErros] = useState<ErrosVeiculo>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Trava síncrona contra toque duplo (o estado só atualiza no próximo render).
  const enviandoRef = useRef(false);

  function alterar(campo: keyof DadosVeiculo) {
    return (valor: string) => {
      setForm((atual) => ({ ...atual, [campo]: valor }));
      setErros((atuais) => ({ ...atuais, [campo]: undefined }));
    };
  }

  /** Volta sem salvar; aberto direto (link/refresh no web), cai na lista. */
  function cancelar() {
    if (router.canGoBack()) router.back();
    else router.replace('/veiculos');
  }

  function voltar() {
    // Só caminhos internos do app (nunca uma URL externa vinda de link).
    if (params.voltarPara?.startsWith('/') && !params.voltarPara.startsWith('//')) router.replace(params.voltarPara as Href);
    else cancelar();
  }

  async function salvar() {
    if (enviandoRef.current) return;

    const errosLocais = validarVeiculo(form);
    setErros(errosLocais);
    setFalha(null);
    if (Object.keys(errosLocais).length > 0) return;

    enviandoRef.current = true;
    setEnviando(true);
    const dados: DadosVeiculo = {
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      cor: form.cor.trim(),
      placa: form.placa.trim(),
    };
    try {
      if (params.id) await atualizarVeiculo(params.id, dados);
      else await criarVeiculo(dados);
      voltar();
    } catch (err) {
      if (err instanceof PlacaJaCadastradaError) setErros({ placa: err.message });
      // 400 sem campos que a tela conheça cai na mensagem genérica (não fica mudo).
      else if (err instanceof ErroValidacaoVeiculo && Object.keys(err.campos).length > 0) setErros(err.campos);
      else if (err instanceof ErroRede || err instanceof VeiculoNaoEncontradoError) setFalha(err.message);
      else setFalha('Não foi possível salvar o veículo agora. Tente de novo.');
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={base.container}>
      <View style={base.topo}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={cancelar} style={base.voltar}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={base.titulo}>{editando ? 'Editar veículo' : 'Novo veículo'}</Text>
      </View>

      <KeyboardAvoidingView style={base.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={base.conteudo} keyboardShouldPersistTaps="handled">
          <View style={base.cartao}>
            <CampoFormulario
              rotulo="Marca (opcional)"
              value={form.marca}
              onChangeText={alterar('marca')}
              placeholder="Ex.: Chevrolet"
              erro={erros.marca}
            />
            <CampoFormulario
              rotulo="Modelo"
              value={form.modelo}
              onChangeText={alterar('modelo')}
              placeholder="Ex.: Onix"
              erro={erros.modelo}
            />
            <CampoFormulario
              rotulo="Cor"
              value={form.cor}
              onChangeText={alterar('cor')}
              placeholder="Ex.: Prata"
              erro={erros.cor}
            />
            <CampoFormulario
              rotulo="Placa"
              value={form.placa}
              onChangeText={alterar('placa')}
              placeholder="ABC-1234 ou ABC1D23"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              erro={erros.placa}
              onSubmitEditing={salvar}
            />
          </View>

          {falha && (
            <Text style={base.erro} accessibilityRole="alert">
              {falha}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={salvar}
            disabled={enviando}
            style={[base.botao, enviando && base.botaoDesabilitado]}>
            {enviando ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={base.botaoTexto}>{editando ? 'Salvar alterações' : 'Cadastrar veículo'}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
