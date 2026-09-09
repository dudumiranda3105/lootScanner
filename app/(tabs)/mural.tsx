import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { MuralCard } from '../../src/components/LootCard';
import { Notice, TextField } from '../../src/components/form';
import { ICON } from '../../src/components/icons';
import { Button, EmptyState, Label } from '../../src/components/ui';
import * as repo from '../../src/db/lootRepo';
import { MuralItem } from '../../src/domain/types';
import { useAuth } from '../../src/hooks/useAuth';
import { useInventory } from '../../src/hooks/useInventory';
import { syncNow } from '../../src/services/sync';
import { colors, spacing } from '../../src/theme/theme';

/**
 * Mural coletivo de achados e perdidos.
 *
 * A lista sai sempre do cache no SQLite (`mural_cache`), então ela abre
 * instantaneamente e continua visível sem internet. Puxar para atualizar chama a
 * sincronização, que troca o cache pelo que está no Supabase.
 */
export default function MuralScreen() {
  const db = useSQLiteContext();
  const { session, configured } = useAuth();
  const { refresh: refreshInventario } = useInventory();

  const [itens, setItens] = useState<MuralItem[]>([]);
  const [busca, setBusca] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const lerCache = useCallback(
    async (termo: string) => {
      setItens(await repo.listMural(db, termo));
    },
    [db],
  );

  useEffect(() => {
    void lerCache(busca);
  }, [lerCache, busca]);

  const sincronizar = useCallback(async () => {
    setAtualizando(true);
    const resultado = await syncNow(db, session?.user.id ?? null);
    setErro(resultado.erro);
    await lerCache(busca);
    await refreshInventario();
    setAtualizando(false);
  }, [db, session?.user.id, busca, lerCache, refreshInventario]);

  // Ao abrir a aba com sessão ativa, busca o mural mais recente.
  useFocusEffect(
    useCallback(() => {
      if (session) void sincronizar();
      else void lerCache(busca);
      // Só reage à troca de sessão; a busca já tem seu próprio efeito.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user.id]),
  );

  if (!configured) {
    return (
      <View style={styles.centro}>
        <EmptyState
          icon="power-plug-off-outline"
          title="Supabase não configurado"
          description="Copie o arquivo .env.example para .env, preencha a URL e a chave anon do seu projeto Supabase e reinicie com: npx expo start --clear"
        />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centro}>
        <EmptyState
          icon={ICON.mural}
          title="Mural da instituição"
          description="Entre na sua conta para ver tudo que foi achado por outras pessoas e publicar os seus registros."
        />
        <Button
          label="Entrar / criar conta"
          icon={ICON.entrar}
          onPress={() => router.push('/login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.tela}>
      <View style={styles.cabecalho}>
        <TextField
          icon={ICON.buscar}
          placeholder="Perdeu algo? Busque por item, local ou pessoa…"
          value={busca}
          onChangeText={setBusca}
          autoCorrect={false}
          returnKeyType="search"
        />
        <Label>{itens.length} itens no mural</Label>
        {erro ? <Notice tone="error">{erro}</Notice> : null}
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.remoteId}
        contentContainerStyle={styles.lista}
        renderItem={({ item, index }) => <MuralCard item={item} index={index} />}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={sincronizar}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={busca ? ICON.nadaEncontrado : ICON.vazioMural}
            title={busca ? 'Nada encontrado' : 'Mural vazio'}
            description={
              busca
                ? 'Nenhum item publicado bate com essa busca. Puxe a lista para baixo para atualizar.'
                : 'Ninguém publicou nada ainda. Escaneie um item e marque "publicar no mural".'
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  centro: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  cabecalho: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  lista: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
