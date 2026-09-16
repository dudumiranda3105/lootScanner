import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { getCatalogEntry } from '../domain/catalog';
import { RARITIES } from '../domain/rarity';
import { LootItem, MuralItem, RarityId } from '../domain/types';
import { colors, font, glow, radius, spacing } from '../theme/theme';
import { SyncPill } from './form';
import { ICON } from './icons';
import { Icon, RarityBadge } from './ui';

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

/** A entrada escalonada só vale para os primeiros cards; depois vira atraso demais. */
const entrada = (index: number) => FadeInDown.delay(Math.min(index, 8) * 45).duration(260);

/**
 * Miniatura do item: a foto quando existe, o ícone do catálogo quando não.
 * O `expo-image` traz cache em disco e transição suave — importa no mural,
 * onde as fotos vêm da rede.
 */
function Thumb({
  photo,
  catalogId,
  rarity,
}: {
  photo: string | null;
  catalogId: string;
  rarity: RarityId;
}) {
  const cor = RARITIES[rarity].color;

  return (
    <View style={[styles.thumb, { borderColor: cor }, glow(cor, 0.35)]}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.thumbImage} contentFit="cover" transition={180} cachePolicy="memory-disk" />
      ) : (
        <Icon name={getCatalogEntry(catalogId).icon} size={28} color={cor} />
      )}
    </View>
  );
}

/** Véu de cor da raridade atrás do conteúdo, da esquerda para a direita. */
function Veu({ rarity }: { rarity: RarityId }) {
  const cor = RARITIES[rarity].color;
  return (
    <LinearGradient
      colors={[`${cor}26`, `${cor}0A`, 'transparent']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

/* ---------------------------------------------------------------- *
 * Item do inventário
 * ---------------------------------------------------------------- */

export function LootCard({
  item,
  index = 0,
  onPress,
}: {
  item: LootItem;
  index?: number;
  onPress: () => void;
}) {
  const rarity = RARITIES[item.rarity];
  const devolvido = item.status === 'devolvido';

  return (
    <Animated.View entering={entrada(index)}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { borderColor: rarity.color },
          pressed && styles.pressed,
        ]}
      >
        <Veu rarity={item.rarity} />

        <Thumb photo={item.photoUri} catalogId={item.catalogId} rarity={item.rarity} />

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, devolvido && styles.nameReturned]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.time}>{tempoRelativo(item.createdAt)}</Text>
          </View>

          <Local texto={item.foundAt} />

          <View style={styles.metaRow}>
            <RarityBadge rarity={item.rarity} size="sm" />
            <SyncPill state={item.syncState} shared={item.shared} />
            {devolvido ? (
              <View style={styles.devolvido}>
                <Icon name={ICON.devolver} size={10} color={colors.success} />
                <Text style={styles.devolvidoTexto}>devolvido</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ---------------------------------------------------------------- *
 * Item do mural coletivo
 * ---------------------------------------------------------------- */

export function MuralCard({ item, index = 0 }: { item: MuralItem; index?: number }) {
  const rarity = RARITIES[item.rarity];
  const devolvido = item.status === 'devolvido';

  return (
    <Animated.View entering={entrada(index)} style={[styles.card, { borderColor: rarity.color }]}>
      <Veu rarity={item.rarity} />

      <Thumb photo={item.photoUrl} catalogId={item.catalogId} rarity={item.rarity} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, devolvido && styles.nameReturned]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.time}>{tempoRelativo(item.createdAt)}</Text>
        </View>

        <Local texto={item.foundAt} />

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
          {devolvido ? (
            <View style={styles.devolvido}>
              <Icon name={ICON.devolver} size={10} color={colors.success} />
              <Text style={styles.devolvidoTexto}>devolvido</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

function Local({ texto }: { texto: string }) {
  return (
    <View style={styles.localRow}>
      <Icon name={ICON.local} size={12} color={colors.textFaint} />
      <Text style={styles.place} numberOfLines={1}>
        {texto || 'local não informado'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    overflow: 'hidden',
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
    fontFamily: font.display,
    fontSize: 15,
  },
  nameReturned: {
    textDecorationLine: 'line-through',
  },
  time: {
    color: colors.textFaint,
    fontFamily: font.mono,
    fontSize: 10,
  },
  localRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  place: {
    color: colors.textMuted,
    flex: 1,
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
  devolvido: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  devolvidoTexto: {
    color: colors.success,
    fontFamily: font.monoBold,
    fontSize: 9,
  },
});
