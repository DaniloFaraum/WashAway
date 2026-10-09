import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/constants/colors';

// Campo de texto com rótulo e erro logo abaixo (telas de login e cadastro).

type Props = TextInputProps & {
  rotulo: string;
  erro?: string;
};

export function CampoFormulario({ rotulo, erro, style, ...props }: Props) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput
        style={[styles.input, erro ? styles.inputComErro : null, style]}
        placeholderTextColor={colors.neutralGray}
        accessibilityLabel={rotulo}
        {...props}
      />
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    gap: 6,
  },
  rotulo: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.black,
  },
  inputComErro: {
    borderColor: colors.danger,
  },
  erro: {
    color: colors.danger,
    fontSize: 13,
  },
});
