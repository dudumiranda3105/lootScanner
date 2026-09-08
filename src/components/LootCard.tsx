import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { RARITIES } from '../domain/rarity';
import { LootItem, MuralItem } from '../domain/types';
import { colors, font, radius, spacing } from '../theme/theme';
import { SyncPill } from './form';
import { RarityBadge } from './ui';

/** "há 5 min", "ontem", "12/03" — data curta, em português. */
export function tempoRelativo(millis: number): string {
  const diff = Date.now() - millis;
  const minutos = Math.floor(diff / 60000);

  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  if (horas < 48) return 'ontem';

  return new Date(millis).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Miniatura do item: a foto quando existe, o emblema do catálogo quando não. */
function Thumb({
  photo,
  emblem,
  color,
}: {
  photo: string | null;
  emblem: string;
  color: string;
}) {
  return (
    <View style={[styles.thumb, { borderColor: color }]}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.thumbImage} resizeMode="cover" />
      ) : (
        <Text style={styles.thumbEmblem}>{emblem}</Text>
      )}
    </View>
  );
}

/* ---------------------------------------------------------------- *
 * Item do inventário
 * ---------------------------------------------------------------- */

export function LootCard({ item, onPress }: { item: LootItem; onPress: () => void }) {
  const rarity = RARITIES[item.rarity];
  const devolvido = item.status === 'devolvido';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: rarity.color, backgroundColor: rarity.tint },
        pressed && styles.pressed,
      ]}
    >
      <Thumb photo={item.photoUri} emblem={item.emblem} color={rarity.color} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, devolvido && styles.nameReturned]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.time}>{tempoRelativo(item.createdAt)}</Text>
        </View>

        <Text style={styles.place} numberOfLines={1}>
          {item.foundAt ? `📍 ${item.foundAt}` : 'local não informado'}
        </Text>

        <View style={styles.metaRow}>
          <RarityBadge rarity={item.rarity} size="sm" />
          <SyncPill state={item.syncState} shared={item.shared} />
          {devolvido ? <Text style={styles.returned}>✓ devolvido</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

/* ---------------------------------------------------------------- *
 * Item do mural coletivo
 * ---------------------------------------------------------------- */

export function MuralCard({ item }: { item: MuralItem }) {
  const rarity = RARITIES[item.rarity];
  const devolvido = item.status === 'devolvido';

  return (
    <View style={[styles.card, { borderColor: rarity.color, backgroundColor: rarity.tint }]}>
      <Thumb photo={item.photoUrl} emblem={item.emblem} color={rarity.color} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, devolvido && styles.nameReturned]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.time}>{tempoRelativo(item.createdAt)}</Text>
        </View>

        <Text style={styles.place} numberOfLines={1}>
          {item.foundAt ? `📍 ${item.foundAt}` : 'local não informado'}
        </Text>

        {item.note ? (
          <Text style={styles.note} numberOfLines={2}>
            {item.note}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <RarityBadge rarity={item.rarity} size="sm" />
          <Text style={styles.finder} numberOfLines={1}>
            achado por {item.finderName}
          </Text>
          {devolvido ? <Text style={styles.returned}>✓ devolvido</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 62,
  },
  thumbImage: {
    height: '100%',
    width: '100%',
  },
  thumbEmblem: {
    fontSize: 28,
  },
  body: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  nameReturned: {
    textDecorationLine: 'line-through',
  },
  time: {
    color: colors.textFaint,
    fontFamily: font.mono,
    fontSize: 10,
  },
  place: {
    color: colors.textMuted,
    fontSize: 12,
  },
  note: {
    color: colors.textFaint,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  finder: {
    color: colors.textFaint,
    flexShrink: 1,
    fontFamily: font.mono,
    fontSize: 10,
  },
  returned: {
    color: colors.success,
    fontFamily: font.mono,
    fontSize: 10,
    fontWeight: '700',
  },
});
