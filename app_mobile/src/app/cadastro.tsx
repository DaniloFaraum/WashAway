import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampoFormulario } from '@/components/CampoFormulario';
import { colors } from '@/constants/colors';
import { authStyles as styles } from '@/features/auth/authStyles';
import { useSessaoCliente } from '@/features/auth/SessaoClienteProvider';
import { MuitasTentativasError } from '@/features/auth/service/auth.service';
import {
  cadastrarCliente,
  EmailJaCadastradoError,
  ErroRede,
  ErroValidacao,
} from '@/features/clientes/service/clientes.service';
import { validarCadastro, type ErrosCadastro, type FormCadastro } from '@/features/clientes/validarCadastro';

// Cadastro de cliente (I1). Depois do 201 o cliente já entra logado com as
// mesmas credenciais (I2) e o gate de `_layout.tsx` leva pra Home.

type Falha =
  | { tipo: 'emailJaCadastrado' }
  | { tipo: 'rede'; mensagem: string }
  | { tipo: 'outra'; mensagem: string }
  | { tipo: 'contaCriadaSemLogin' };

export default function CadastroScreen() {
  const router = useRouter();
  const { entrar } = useSessaoCliente();

  const [form, setForm] = useState<FormCadastro>({ nome: '', email: '', senha: '', confirmacao: '' });
  const [erros, setErros] = useState<ErrosCadastro>({});
  const [falha, setFalha] = useState<Falha | null>(null);
  const [contaCriada, setContaCriada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Trava síncrona contra toque duplo (o estado só atualiza no próximo render).
  const enviandoRef = useRef(false);

  function alterar(campo: keyof FormCadastro) {
    return (valor: string) => {
      setForm((atual) => ({ ...atual, [campo]: valor }));
      setErros((atuais) => ({ ...atuais, [campo]: undefined }));
    };
  }

  function irParaLogin() {
    router.replace({ pathname: '/login', params: { email: form.email.trim() } });
  }

  async function handleCriarConta() {
    if (enviandoRef.current) return;

    const errosLocais = validarCadastro(form);
    setErros(errosLocais);
    setFalha(null);
    if (Object.keys(errosLocais).length > 0) return;

    enviandoRef.current = true;
    setEnviando(true);
    const email = form.email.trim();
    try {
      await cadastrarCliente({ nome: form.nome.trim(), email, senha: form.senha });
      setContaCriada(true);
      try {
        await entrar(email, form.senha);
      } catch {
        // Conta criada, mas o login automático falhou (ex.: rede): segue pelo login.
        setFalha({ tipo: 'contaCriadaSemLogin' });
      }
    } catch (err) {
      if (err instanceof EmailJaCadastradoError) setFalha({ tipo: 'emailJaCadastrado' });
      // 400 sem campos que a tela conheça cai na mensagem genérica (não fica mudo).
      else if (err instanceof ErroValidacao && Object.keys(err.campos).length > 0) setErros(err.campos);
      else if (err instanceof ErroRede) setFalha({ tipo: 'rede', mensagem: err.message });
      else if (err instanceof MuitasTentativasError) setFalha({ tipo: 'outra', mensagem: err.message });
      else setFalha({ tipo: 'outra', mensagem: 'Não foi possível criar a conta agora. Tente de novo.' });
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <Text style={styles.titulo}>
            WASH <Text style={styles.tituloDestaque}>YOUR</Text> WAY
          </Text>
          <Text style={styles.subtitulo}>Crie sua conta</Text>

          <View style={styles.formulario}>
            <CampoFormulario
              rotulo="Nome"
              value={form.nome}
              onChangeText={alterar('nome')}
              placeholder="Seu nome"
              autoComplete="name"
              textContentType="name"
              erro={erros.nome}
            />
            <CampoFormulario
              rotulo="E-mail"
              value={form.email}
              onChangeText={alterar('email')}
              placeholder="voce@exemplo.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              erro={erros.email}
            />
            <CampoFormulario
              rotulo="Senha"
              value={form.senha}
              onChangeText={alterar('senha')}
              placeholder="Mínimo de 6 caracteres"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              erro={erros.senha}
            />
            <CampoFormulario
              rotulo="Confirmar senha"
              value={form.confirmacao}
              onChangeText={alterar('confirmacao')}
              placeholder="Repita a senha"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              erro={erros.confirmacao}
              onSubmitEditing={handleCriarConta}
            />

            {contaCriada && (
              <Text style={styles.sucesso} accessibilityRole="alert">
                Conta criada!
              </Text>
            )}

            {falha?.tipo === 'emailJaCadastrado' && (
              <View style={styles.rodape}>
                <Text style={styles.erro} accessibilityRole="alert">
                  Este e-mail já está cadastrado.
                </Text>
                <Pressable accessibilityRole="link" onPress={irParaLogin}>
                  <Text style={styles.link}>Entrar</Text>
                </Pressable>
              </View>
            )}

            {falha?.tipo === 'contaCriadaSemLogin' && (
              <View style={styles.rodape}>
                <Text style={styles.erro} accessibilityRole="alert">
                  Não foi possível entrar automaticamente.
                </Text>
                <Pressable accessibilityRole="link" onPress={irParaLogin}>
                  <Text style={styles.link}>Entrar</Text>
                </Pressable>
              </View>
            )}

            {(falha?.tipo === 'rede' || falha?.tipo === 'outra') && (
              <Text style={styles.erro} accessibilityRole="alert">
                {falha.mensagem}
              </Text>
            )}

            {!contaCriada && (
              <Pressable
                style={[styles.botao, enviando && styles.botaoDesabilitado]}
                accessibilityRole="button"
                accessibilityState={{ disabled: enviando }}
                disabled={enviando}
                onPress={handleCriarConta}>
                {enviando ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.botaoTexto}>
                    {falha?.tipo === 'rede' ? 'Tentar de novo' : 'Criar conta'}
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          <View style={styles.rodape}>
            <Text style={styles.rodapeTexto}>Já tem conta?</Text>
            <Pressable accessibilityRole="link" onPress={() => router.replace('/login')}>
              <Text style={styles.link}>Entrar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
