import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MODELOS_IA, ModeloIA } from '../domain/modelosIA';
import { colors, font, radius, spacing } from '../theme/theme';
import { Body, Button, Icon, Label, Subtitle } from './ui';

/**
 * Escolha do modelo que identifica os itens.
 *
 * A lista vem de `src/domain/modelosIA.ts`, que é também a lista permitida na
 * Edge Function — ela recusa qualquer id fora dela.
 */
export function SeletorModelo({
  visivel,
  selecionado,
  onEscolher,
  onFechar,
}: {
  visivel: boolean;
  selecionado: string;
  onEscolher: (modelo: ModeloIA) => void;
  onFechar: () => void;
}) {
  const gratuitos = MODELOS_IA.filter((m) => m.gratuito);
  const pagos = MODELOS_IA.filter((m) => !m.gratuito);

  const linha = (modelo: ModeloIA) => {
    const ativo = modelo.id === selecionado;

    return (
      <Pressable
        key={modelo.id}
        accessibilityRole="button"
        accessibilityState={{ selected: ativo }}
        onPress={() => onEscolher(modelo)}
        style={({ pressed }) => [
          styles.linha,
          ativo && styles.linhaAtiva,
          pressed && styles.pressionado,
        ]}
      >
        <View style={styles.linhaTopo}>
          <Text style={[styles.nome, ativo && styles.nomeAtivo]}>{modelo.nome}</Text>
          {modelo.gratuito ? (
            <View style={styles.selo}>
              <Text style={styles.seloTexto}>GRÁTIS</Text>
            </View>
          ) : (
            <View style={[styles.selo, styles.seloPago]}>
              <Text style={[styles.seloTexto, styles.seloTextoPago]}>PAGO</Text>
            </View>
          )}
          {ativo ? <Icon name="check-circle" size={18} color={colors.gold} /> : null}
        </View>

        <Text style={styles.fornecedor}>{modelo.fornecedor}</Text>
        <Body style={styles.nota}>{modelo.nota}</Body>
      </Pressable>
    );
  };

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={onFechar} statusBarTranslucent>
      <View style={styles.tela}>
        <View style={styles.cabecalho}>
          <Subtitle>Modelo de identificação</Subtitle>
          <Body style={styles.explicacao}>
            É o modelo que olha a foto e diz que item é. Se um deles errar muito ou atingir o limite
            diário, troque por outro — dá para mudar quando quiser.
          </Body>
        </View>

        <ScrollView contentContainerStyle={styles.lista}>
          <Label>Gratuitos</Label>
          {gratuitos.map(linha)}

          <Label style={styles.tituloPagos}>Exigem crédito no OpenRouter</Label>
          {pagos.map(linha)}

          <Body style={styles.rodapeNota}>
            Os gratuitos têm limite diário de uso e costumam errar mais que os pagos. Se a
            identificação falhar, o app usa o modo simulado e você ainda pode escolher o item na
            mão.
          </Body>
        </ScrollView>

        <View style={styles.rodape}>
          <Button label="Fechar" tone="ghost" onPress={onFechar} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tela: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  cabecalho: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
  },
  explicacao: {
    fontSize: 13,
    lineHeight: 19,
  },
  lista: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  tituloPagos: {
    marginTop: spacing.lg,
  },
  linha: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 3,
    padding: spacing.md,
  },
  linhaAtiva: {
    backgroundColor: 'rgba(232,184,75,0.10)',
    borderColor: colors.gold,
  },
  pressionado: {
    opacity: 0.7,
  },
  linhaTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nome: {
    color: colors.text,
    flex: 1,
    fontFamily: font.display,
    fontSize: 16,
  },
  nomeAtivo: {
    color: colors.gold,
  },
  fornecedor: {
    color: colors.textFaint,
    fontFamily: font.mono,
    fontSize: 10,
  },
  nota: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  selo: {
    backgroundColor: 'rgba(75,197,138,0.14)',
    borderColor: colors.success,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  seloPago: {
    backgroundColor: 'rgba(154,160,192,0.14)',
    borderColor: colors.textMuted,
  },
  seloTexto: {
    color: colors.success,
    fontFamily: font.monoBold,
    fontSize: 8.5,
    letterSpacing: 0.6,
  },
  seloTextoPago: {
    color: colors.textMuted,
  },
  rodapeNota: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.md,
  },
  rodape: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg,
  },
});
