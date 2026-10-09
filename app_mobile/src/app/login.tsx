import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { authStyles } from '@/features/auth/authStyles';
import { useSessaoCliente } from '@/features/auth/SessaoClienteProvider';
import { CredenciaisInvalidasError } from '@/features/auth/service/auth.service';
import { ErroRede } from '@/services/httpClient';

const styles = authStyles;

// Login do cliente (I2). Depois de entrar, o gate de `_layout.tsx` leva pra Home.
// Parâmetros: `email` (vindo do cadastro) e `expirada=1` (sessão caiu por 401).

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; expirada?: string }>();
  const { entrar } = useSessaoCliente();

  const [email, setEmail] = useState(params.email ?? '');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  const sessaoExpirada = params.expirada === '1' && !erro;

  async function handleEntrar() {
    if (enviandoRef.current) return;
    if (email.trim() === '' || senha === '') {
      setErro('Informe e-mail e senha');
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErro(null);
    try {
      await entrar(email.trim(), senha);
    } catch (err) {
      if (err instanceof CredenciaisInvalidasError || err instanceof ErroRede) setErro(err.message);
      else setErro('Não foi possível entrar agora. Tente de novo.');
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
          <Text style={styles.subtitulo}>Entre na sua conta</Text>

          {sessaoExpirada && (
            <Text style={styles.aviso} accessibilityRole="alert">
              Sua sessão expirou. Entre de novo.
            </Text>
          )}

          <View style={styles.formulario}>
            <CampoFormulario
              rotulo="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="voce@exemplo.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <CampoFormulario
              rotulo="Senha"
              value={senha}
              onChangeText={setSenha}
              placeholder="Sua senha"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={handleEntrar}
            />

            {erro && (
              <Text style={styles.erro} accessibilityRole="alert">
                {erro}
              </Text>
            )}

            <Pressable
              style={[styles.botao, enviando && styles.botaoDesabilitado]}
              accessibilityRole="button"
              accessibilityState={{ disabled: enviando }}
              disabled={enviando}
              onPress={handleEntrar}>
              {enviando ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.botaoTexto}>Entrar</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.rodape}>
            <Text style={styles.rodapeTexto}>Ainda não tem conta?</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/cadastro')}>
              <Text style={styles.link}>Criar conta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
