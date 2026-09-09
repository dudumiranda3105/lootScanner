import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  ColorValue,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { RARITIES } from '../domain/rarity';
import { RarityId } from '../domain/types';
import { colors, font, glow, motion, radius, spacing } from '../theme/theme';
import { IconName, MaterialCommunityIcons } from './icons';

/* ---------------------------------------------------------------- *
 * Ícone
 * ---------------------------------------------------------------- */

export function Icon({
  name,
  size = 18,
  color = colors.textMuted,
  style,
}: {
  name: IconName;
  size?: number;
  /** `ColorValue` e nao `string`: e o tipo que a tab bar do expo-router entrega. */
  color?: ColorValue;
  style?: TextProps['style'];
}) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}

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

/** Números e dados de ficha — sempre na monoespaçada, para alinharem. */
export function Mono({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.mono, style]} />;
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
      <Icon name="rhombus-outline" size={9} color={colors.goldDim} />
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
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'ghost' | 'danger';
  style?: ViewProps['style'];
}

export function Button({
  label,
  onPress,
  icon,
  disabled,
  loading,
  tone = 'primary',
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const labelColor =
    tone === 'primary' ? '#1A1206' : tone === 'danger' ? colors.danger : colors.text;

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
        <View style={styles.buttonContent}>
          {icon ? <Icon name={icon} size={18} color={labelColor} /> : null}
          <Text style={[styles.buttonLabel, { color: labelColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ---------------------------------------------------------------- *
 * Raridade
 * ---------------------------------------------------------------- */

export function RarityBadge({ rarity, size = 'md' }: { rarity: RarityId; size?: 'sm' | 'md' }) {
  const def = RARITIES[rarity];
  const pequeno = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: def.tint, borderColor: def.color },
        pequeno && styles.badgeSm,
      ]}
    >
      <Icon name={def.icon} size={pequeno ? 9 : 11} color={def.color} />
      <Text style={[styles.badgeText, { color: def.color }, pequeno && styles.badgeTextSm]}>
        {def.label.toUpperCase()}
      </Text>
    </View>
  );
}

/* ---------------------------------------------------------------- *
 * Barra de progresso
 * ---------------------------------------------------------------- */

/** A barra enche animada quando o valor muda — dá a sensação de ganhar XP. */
export function ProgressBar({ value, color = colors.gold }: { value: number; color?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  const largura = useSharedValue(0);

  useEffect(() => {
    largura.value = withTiming(clamped, { duration: motion.slow });
  }, [clamped, largura]);

  const estilo = useAnimatedStyle(() => ({ width: `${largura.value * 100}%` }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          { backgroundColor: color },
          clamped > 0 && glow(color, 0.6),
          estilo,
        ]}
      />
    </View>
  );
}

/* ---------------------------------------------------------------- *
 * Estado vazio
 * ---------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconRing}>
        <Icon name={icon} size={38} color={colors.textFaint} />
      </View>
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
  icon,
  color = colors.gold,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
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
      {icon ? <Icon name={icon} size={13} color={selected ? color : colors.textFaint} /> : null}
      <Text style={[styles.chipText, selected && { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontFamily: font.display,
    fontSize: 24,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.text,
    fontFamily: font.display,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: colors.textFaint,
    fontFamily: font.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  mono: {
    color: colors.textMuted,
    fontFamily: font.mono,
    fontSize: 12,
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
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
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
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeSm: {
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: font.monoBold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  badgeTextSm: {
    fontSize: 8,
    letterSpacing: 0.5,
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
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 2,
  },
  emptyIconRing: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    color: colors.textMuted,
    fontFamily: font.monoBold,
    fontSize: 11,
  },
});
