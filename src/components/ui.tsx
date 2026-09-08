import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
} from 'react-native';

import { RARITIES } from '../domain/rarity';
import { RarityId } from '../domain/types';
import { colors, font, radius, spacing } from '../theme/theme';

/* ---------------------------------------------------------------- *
 * Tipografia
 * ---------------------------------------------------------------- */

export function Title({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.title, style]} />;
}

export function Subtitle({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.subtitle, style]} />;
}

export function Body({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.body, style]} />;
}

export function Label({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.label, style]} />;
}

/* ---------------------------------------------------------------- *
 * Superfícies
 * ---------------------------------------------------------------- */

export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}

/** Divisória decorativa com losango ao centro, no estilo de menu de RPG. */
export function Divider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerGem}>◆</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

/* ---------------------------------------------------------------- *
 * Botões
 * ---------------------------------------------------------------- */

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'ghost' | 'danger';
  style?: ViewProps['style'];
}

export function Button({ label, onPress, disabled, loading, tone = 'primary', style }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        tone === 'primary' && styles.buttonPrimary,
        tone === 'ghost' && styles.buttonGhost,
        tone === 'danger' && styles.buttonDanger,
        pressed && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone === 'primary' ? colors.bg : colors.text} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            tone === 'primary' && styles.buttonLabelPrimary,
            tone === 'danger' && styles.buttonLabelDanger,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/* ---------------------------------------------------------------- *
 * Raridade
 * ---------------------------------------------------------------- */

export function RarityBadge({ rarity, size = 'md' }: { rarity: RarityId; size?: 'sm' | 'md' }) {
  const def = RARITIES[rarity];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: def.tint, borderColor: def.color },
        size === 'sm' && styles.badgeSm,
      ]}
    >
      <Text style={[styles.badgeText, { color: def.color }, size === 'sm' && styles.badgeTextSm]}>
        {def.label.toUpperCase()}
      </Text>
    </View>
  );
}

/* ---------------------------------------------------------------- *
 * Barra de progresso
 * ---------------------------------------------------------------- */

export function ProgressBar({ value, color = colors.gold }: { value: number; color?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressTrack}>
      <View
        style={[styles.progressFill, { width: `${clamped * 100}%`, backgroundColor: color }]}
      />
    </View>
  );
}

/* ---------------------------------------------------------------- *
 * Estado vazio
 * ---------------------------------------------------------------- */

export function EmptyState({ emblem, title, description }: { emblem: string; title: string; description: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmblem}>{emblem}</Text>
      <Subtitle style={styles.emptyTitle}>{title}</Subtitle>
      <Body style={styles.emptyBody}>{description}</Body>
    </View>
  );
}

/* ---------------------------------------------------------------- *
 * Chip selecionável
 * ---------------------------------------------------------------- */

export function Chip({
  label,
  selected,
  onPress,
  color = colors.gold,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { borderColor: color, backgroundColor: `${color}22` },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.chipText, selected && { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  dividerLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  dividerGem: {
    color: colors.goldDim,
    fontSize: 10,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderColor: colors.borderStrong,
  },
  buttonDanger: {
    backgroundColor: 'transparent',
    borderColor: colors.danger,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  buttonLabelPrimary: {
    color: '#1A1206',
  },
  buttonLabelDanger: {
    color: colors.danger,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  badgeTextSm: {
    fontSize: 8.5,
    letterSpacing: 0.6,
  },
  progressTrack: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 2,
  },
  emptyEmblem: {
    fontSize: 44,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    color: colors.textMuted,
    fontFamily: font.mono,
    fontSize: 12,
    fontWeight: '700',
  },
});
