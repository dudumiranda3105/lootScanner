import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Notice, TextField } from '../../src/components/form';
import {
  Body,
  Button,
  Card,
  Divider,
  Label,
  ProgressBar,
  Subtitle,
  Title,
} from '../../src/components/ui';
import { CATALOG_SIZE } from '../../src/domain/catalog';
import { RARITIES, RARITY_ORDER } from '../../src/domain/rarity';
import { useAuth } from '../../src/hooks/useAuth';
import { useInventory } from '../../src/hooks/useInventory';
import { lastSyncAt, syncNow } from '../../src/services/sync';
import { colors, font, radius, spacing } from '../../src/theme/theme';

export default function PerfilScreen() {
  const db = useSQLiteContext();
  const { stats, pendingCount, refresh } = useInventory();
  const { session, profile, configured, signOut, updateHunterName } = useAuth();

  const [nome, setNome] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoSync, setUltimoSync] = useState<Date | null>(null);
  const [aviso, setAviso] = useState<{ tom: 'info' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    setNome(profile?.hunterName ?? '');
  }, [profile?.hunterName]);

  useEffect(() => {
    void lastSyncAt(db).then(setUltimoSync);
  }, [db]);

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    setAviso(null);

    const resultado = await syncNow(db, session?.user.id ?? null);
    await refresh();
    setUltimoSync(await lastSyncAt(db));

    setAviso(
      resultado.ok
        ? {
            tom: 'info',
            texto: `Sincronizado: ${resultado.enviados} enviado(s), ${resultado.removidos} removido(s), ${resultado.recebidos} item(ns) no mural.`,
          }
        : { tom: 'error', texto: resultado.erro ?? 'Não foi possível sincronizar.' },
    );
    setSincronizando(false);
  }, [db, session?.user.id, refresh]);

  const salvarNome = useCallback(async () => {
    setSalvandoNome(true);
    setAviso(null);
    try {
      await updateHunterName(nome);
      setAviso({ tom: 'info', texto: 'Nome de caçador atualizado.' });
    } catch (error) {
      setAviso({ tom: 'error', texto: error instanceof Error ? error.message : String(error) });
    }
    setSalvandoNome(false);
  }, [nome, updateHunterName]);

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      {/* ---------------- progresso do caçador ---------------- */}

      <Card style={styles.cartao}>
        <Label>Caçador</Label>
        <Title>{profile?.hunterName ?? 'Caçador anônimo'}</Title>

        <View style={styles.nivelRow}>
          <Subtitle>Nível {stats.level}</Subtitle>
          <Body style={styles.mono}>
            {stats.xpIntoLevel} / {stats.xpForNextLevel} XP
          </Body>
        </View>
        <ProgressBar value={stats.xpIntoLevel / stats.xpForNextLevel} />

        <Divider />

        <View style={styles.numeros}>
          <Numero valor={stats.total} rotulo="achados" />
          <Numero valor={stats.stored} rotulo="guardados" />
          <Numero valor={stats.returned} rotulo="devolvidos" cor={colors.success} />
        </View>
      </Card>

      {/* ---------------- coleção ---------------- */}

      <Card style={styles.cartao}>
        <Label>Coleção de itens</Label>
        <View style={styles.nivelRow}>
          <Body>Tipos diferentes já catalogados</Body>
          <Body style={styles.mono}>
            {stats.discovered.size} / {CATALOG_SIZE}
          </Body>
        </View>
        <ProgressBar value={stats.collectionProgress} />

        <Divider />

        <Label>Por raridade</Label>
        <View style={styles.raridades}>
          {RARITY_ORDER.map((raridade) => (
            <View
              key={raridade}
              style={[
                styles.raridade,
                { borderColor: RARITIES[raridade].color, backgroundColor: RARITIES[raridade].tint },
              ]}
            >
              <Text style={[styles.raridadeValor, { color: RARITIES[raridade].color }]}>
                {stats.byRarity[raridade]}
              </Text>
              <Text style={styles.raridadeRotulo}>{RARITIES[raridade].label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* ---------------- conta ---------------- */}

      <Card style={styles.cartao}>
        <Label>Conta</Label>

        {!configured ? (
          <Notice>
            Supabase ainda não configurado. Copie .env.example para .env, preencha a URL e a chave
            anon do seu projeto e reinicie com: npx expo start --clear
          </Notice>
        ) : session ? (
          <>
            <Body>{session.user.email}</Body>
            <TextField
              label="Nome de caçador"
              value={nome}
              onChangeText={setNome}
              placeholder="Como você aparece no mural"
            />
            <Button label="Salvar nome" onPress={salvarNome} loading={salvandoNome} tone="ghost" />
            <Button label="Sair da conta" tone="danger" onPress={signOut} />
          </>
        ) : (
          <>
            <Body>
              Entre para publicar seus achados no mural coletivo e ver o que outras pessoas
              encontraram.
            </Body>
            <Button label="Entrar / criar conta" onPress={() => router.push('/login')} />
          </>
        )}
      </Card>

      {/* ---------------- sincronização ---------------- */}

      <Card style={styles.cartao}>
        <Label>Sincronização com o Supabase</Label>

        <View style={styles.nivelRow}>
          <Body>Alterações pendentes</Body>
          <Body style={[styles.mono, pendingCount > 0 && styles.pendente]}>{pendingCount}</Body>
        </View>

        <View style={styles.nivelRow}>
          <Body>Última sincronização</Body>
          <Body style={styles.mono}>
            {ultimoSync ? ultimoSync.toLocaleString('pt-BR') : 'nunca'}
          </Body>
        </View>

        <Button
          label="Sincronizar agora"
          onPress={sincronizar}
          loading={sincronizando}
          disabled={!configured || !session}
        />

        {aviso ? <Notice tone={aviso.tom}>{aviso.texto}</Notice> : null}

        <Body style={styles.explicacao}>
          Os itens ficam salvos no SQLite deste aparelho e continuam acessíveis sem internet. Os que
          você marcou como "publicar no mural" sobem para o PostgreSQL do Supabase na próxima
          sincronização.
        </Body>
      </Card>
    </ScrollView>
  );
}

function Numero({ valor, rotulo, cor }: { valor: number; rotulo: string; cor?: string }) {
  return (
    <View style={styles.numero}>
      <Text style={[styles.numeroValor, cor ? { color: cor } : null]}>{valor}</Text>
      <Text style={styles.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  cartao: {
    gap: spacing.md,
  },
  nivelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mono: {
    color: colors.textMuted,
    fontFamily: font.mono,
    fontSize: 12,
  },
  pendente: {
    color: colors.gold,
    fontWeight: '700',
  },
  numeros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  numero: {
    alignItems: 'center',
    gap: 2,
  },
  numeroValor: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: '800',
  },
  numeroRotulo: {
    color: colors.textFaint,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  raridades: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  raridade: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: 2,
    minWidth: 62,
    paddingVertical: spacing.sm,
  },
  raridadeValor: {
    fontSize: 18,
    fontWeight: '800',
  },
  raridadeRotulo: {
    color: colors.textFaint,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  explicacao: {
    fontSize: 12,
    lineHeight: 18,
  },
});
