import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { LootCard } from '../../src/components/LootCard';
import { Loading, TextField } from '../../src/components/form';
import { Body, Chip, EmptyState, Label } from '../../src/components/ui';
import { RARITIES, RARITY_ORDER } from '../../src/domain/rarity';
import { RarityId } from '../../src/domain/types';
import { useInventory } from '../../src/hooks/useInventory';
import { colors, spacing } from '../../src/theme/theme';

type Filtro = 'todos' | 'guardado' | 'devolvido' | RarityId;

const FILTROS: { id: Filtro; label: string; color?: string }[] = [
  { id: 'todos', label: 'Tudo' },
  { id: 'guardado', label: 'Guardados' },
  { id: 'devolvido', label: 'Devolvidos', color: colors.success },
  ...RARITY_ORDER.map((rarity) => ({
    id: rarity as Filtro,
    label: RARITIES[rarity].label,
    color: RARITIES[rarity].color,
  })),
];

export default function InventarioScreen() {
  const { items, loading, stats } = useInventory();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return items.filter((item) => {
      if (filtro === 'guardado' || filtro === 'devolvido') {
        if (item.status !== filtro) return false;
      } else if (filtro !== 'todos' && item.rarity !== filtro) {
        return false;
      }

      if (!termo) return true;
      return (
        item.name.toLowerCase().includes(termo) ||
        item.foundAt.toLowerCase().includes(termo) ||
        item.note.toLowerCase().includes(termo)
      );
    });
  }, [items, busca, filtro]);

  if (loading) return <Loading message="Abrindo o inventário…" />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TextField
          placeholder="Buscar por item, local ou observação…"
          value={busca}
          onChangeText={setBusca}
          autoCorrect={false}
          returnKeyType="search"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtros}
        >
          {FILTROS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={filtro === item.id}
              color={item.color}
              onPress={() => setFiltro(item.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.resumoRow}>
          <Label>
            {visiveis.length} de {stats.total} itens
          </Label>
          <Body style={styles.resumoXp}>
            Nível {stats.level} · {stats.xp} XP
          </Body>
        </View>
      </View>

      <FlatList
        data={visiveis}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <LootCard
            item={item}
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          items.length === 0 ? (
            <EmptyState
              emblem="🎒"
              title="Inventário vazio"
              description="Vá até a aba Escanear e fotografe o primeiro objeto achado para começar a coleção."
            />
          ) : (
            <EmptyState
              emblem="🔍"
              title="Nada por aqui"
              description="Nenhum item bate com essa busca ou filtro."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  header: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  filtros: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  resumoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resumoXp: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  lista: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
