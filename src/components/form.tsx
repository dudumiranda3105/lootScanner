import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors, font, radius, spacing } from '../theme/theme';
import { Label } from './ui';

/* ---------------------------------------------------------------- *
 * Campo de texto
 * ---------------------------------------------------------------- */

interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
}

export function TextField({ label, hint, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.field}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        {...props}
        style={[styles.input, props.multiline && styles.inputMultiline, style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/* ---------------------------------------------------------------- *
 * Interruptor
 *
 * Escrito à mão em vez de usar o <Switch> nativo: assim ele acompanha a
 * paleta escura do app em Android e iOS sem depender de props de plataforma.
 * ---------------------------------------------------------------- */

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ value, onChange, title, description, disabled }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      onPress={() => !disabled && onChange(!value)}
      style={({ pressed }) => [
        styles.toggleRow,
        pressed && !disabled && styles.pressed,
        disabled && styles.toggleDisabled,
      ]}
    >
      <View style={styles.toggleTexts}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {description ? <Text style={styles.toggleDescription}>{description}</Text> : null}
      </View>

      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.thumb, value && styles.thumbOn]} />
      </View>
    </Pressable>
  );
}

/* ---------------------------------------------------------------- *
 * Selo de sincronização
 * ---------------------------------------------------------------- */

export function SyncPill({
  state,
  shared,
}: {
  state: 'pending' | 'synced';
  shared: boolean;
}) {
  if (!shared) {
    return (
      <View style={[styles.pill, { borderColor: colors.border }]}>
        <Text style={[styles.pillText, { color: colors.textFaint }]}>◇ só local</Text>
      </View>
    );
  }

  const synced = state === 'synced';

  return (
    <View style={[styles.pill, { borderColor: synced ? colors.success : colors.gold }]}>
      <Text style={[styles.pillText, { color: synced ? colors.success : colors.gold }]}>
        {synced ? '☁ no mural' : '↑ pendente'}
      </Text>
    </View>
  );
}

/* ---------------------------------------------------------------- *
 * Aviso / mensagem de erro
 * ---------------------------------------------------------------- */

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error'; children: string }) {
  const color = tone === 'error' ? colors.danger : colors.gold;
  return (
    <View style={[styles.notice, { borderColor: color, backgroundColor: `${color}14` }]}>
      <Text style={[styles.noticeText, { color }]}>{children}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- *
 * Carregando (tela inteira)
 * ---------------------------------------------------------------- */

export function Loading({ message }: { message?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.gold} size="large" />
      {message ? <Text style={styles.loadingText}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  hint: {
    color: colors.textFaint,
    fontSize: 11,
  },
  toggleRow: {
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  toggleTexts: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  track: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    padding: 3,
    width: 52,
  },
  trackOn: {
    backgroundColor: colors.goldDim,
    borderColor: colors.gold,
  },
  thumb: {
    backgroundColor: colors.textFaint,
    borderRadius: radius.pill,
    height: 22,
    width: 22,
  },
  thumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.gold,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: font.mono,
    fontSize: 10,
    fontWeight: '700',
  },
  notice: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
