import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { horariosDisponiveis, horariosDoDia, proximosDias, DIAS_SELECIONAVEIS } from '@/features/pedidos/dataHora';

// Seletor de data e hora (I13, decisão D4): lista própria, sem dependência nova,
// igual no celular e no web — os próximos 30 dias (hoje primeiro) e horários de
// 30 em 30 minutos. Dias/horários que já passaram não aparecem/ficam
// desabilitados. Datas e horas são locais do negócio (America/Sao_Paulo; ver
// features/pedidos/dataHora.ts). Reaproveitado pelo I9 (busca por horário).

export interface ValorDataHora {
  /** "YYYY-MM-DD" */
  data: string | null
  /** "HH:mm" */
  hora: string | null
}

interface Props {
  valor: ValorDataHora;
  onChange: (valor: ValorDataHora) => void;
  /** "Agora" de referência (testes/I9); padrão: o relógio. */
  agora?: Date;
  dias?: number;
  /** Conteúdo extra abaixo dos dias (ex.: horário de funcionamento do dia, I20). */
  rodapeDoDia?: ReactNode;
}

export function SeletorDataHora({ valor, onChange, agora: agoraProp, dias = DIAS_SELECIONAVEIS, rodapeDoDia }: Props) {
  // Um "agora" por renderização basta: o resumo confere de novo antes de enviar,
  // e o backend recusa horário no passado.
  const agora = agoraProp ?? new Date();
  const listaDias = proximosDias(agora, dias);
  const todos = horariosDoDia();
  const disponiveis = new Set(valor.data ? horariosDisponiveis(valor.data, agora) : []);

  function escolherDia(data: string) {
    // Mantém a hora se ela ainda valer no dia novo.
    const hora = valor.hora && horariosDisponiveis(data, agora).includes(valor.hora) ? valor.hora : null;
    onChange({ data, hora });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>Dia</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dias}>
        {listaDias.map((dia) => {
          const semHorario = horariosDisponiveis(dia.data, agora).length === 0;
          const selecionado = valor.data === dia.data;
          return (
            <Pressable
              key={dia.data}
              accessibilityRole="button"
              accessibilityState={{ selected: selecionado, disabled: semHorario }}
              accessibilityLabel={`${dia.rotulo} ${dia.diaMes}`}
              disabled={semHorario}
              onPress={() => escolherDia(dia.data)}
              style={[styles.dia, selecionado && styles.selecionado, semHorario && styles.desabilitado]}>
              <Text style={[styles.diaRotulo, selecionado && styles.textoSelecionado]}>{dia.rotulo}</Text>
              <Text style={[styles.diaMes, selecionado && styles.textoSelecionado]}>{dia.diaMes}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {rodapeDoDia}

      <Text style={styles.rotulo}>Horário</Text>
      {!valor.data ? (
        <Text style={styles.dica}>Escolha um dia para ver os horários.</Text>
      ) : (
        <View style={styles.horas}>
          {todos.map((hora) => {
            const disponivel = disponiveis.has(hora);
            const selecionado = valor.hora === hora;
            return (
              <Pressable
                key={hora}
                accessibilityRole="button"
                accessibilityState={{ selected: selecionado, disabled: !disponivel }}
                accessibilityLabel={`Horário ${hora}`}
                disabled={!disponivel}
                onPress={() => onChange({ data: valor.data, hora })}
                style={[styles.hora, selecionado && styles.selecionado, !disponivel && styles.desabilitado]}>
                <Text style={[styles.horaTexto, selecionado && styles.textoSelecionado]}>{hora}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  rotulo: { fontSize: 15, fontWeight: '700', color: colors.black },
  dica: { fontSize: 13, color: colors.neutralGray },
  dias: { gap: 8, paddingVertical: 2 },
  dia: {
    minWidth: 64,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  diaRotulo: { fontSize: 13, fontWeight: '700', color: colors.black, textTransform: 'capitalize' },
  diaMes: { fontSize: 12, color: colors.neutralGray },
  horas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hora: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  horaTexto: { fontSize: 14, fontWeight: '600', color: colors.black },
  selecionado: { backgroundColor: colors.primary, borderColor: colors.primary },
  textoSelecionado: { color: colors.white },
  desabilitado: { opacity: 0.35 },
});
