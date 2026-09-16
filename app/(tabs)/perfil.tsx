import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Notice, TextField } from '../../src/components/form';
import { SeletorModelo } from '../../src/components/SeletorModelo';
import { ICON } from '../../src/components/icons';
import {
  Body,
  Button,
  Card,
  Divider,
  Icon,
  Label,
  Mono,
  ProgressBar,
  Title,
} from '../../src/components/ui';
import { CATALOG_SIZE } from '../../src/domain/catalog';
import { RARITIES, RARITY_ORDER } from '../../src/domain/rarity';
import { useAuth } from '../../src/hooks/useAuth';
import { useInventory } from '../../src/hooks/useInventory';
import { definirModelo, modeloAtual } from '../../src/services/modeloIA';
import { lastSyncAt, syncNow } from '../../src/services/sync';
import { colors, font, glow, radius, spacing } from '../../src/theme/theme';

export default function PerfilScreen() {
  const db = useSQLiteContext();
  const { stats, pendingCount, refresh } = useInventory();
  const { session, profile, configured, signOut, updateHunterName } = useAuth();

  const [nome, setNome] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoSync, setUltimoSync] = useState<Date | null>(null);
  const [aviso, setAviso] = useState<{ tom: 'info' | 'error'; texto: string } | null>(null);
  const [escolhendoModelo, setEscolhendoModelo] = useState(false);
  const [modelo, setModelo] = useState(modeloAtual());

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
            texto:
              resultado.enviados > 0
                ? `Tudo em dia. ${resultado.enviados} ${resultado.enviados === 1 ? 'item enviado' : 'itens enviados'} para o mural.`
                : 'Tudo em dia. Nada pendente para enviar.',
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
      {/* ---------------- brasão do caçador ---------------- */}

      <Animated.View entering={FadeInDown.duration(300)} style={styles.brasao}>
        <LinearGradient
          colors={['#3A2E10', colors.surface, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.brasaoTopo}>
          <View style={styles.coroa}>
            <Icon name="crown-outline" size={26} color={colors.gold} />
          </View>

          <View style={styles.brasaoTextos}>
            <Label>Caçador</Label>
            <Title numberOfLines={1}>{profile?.hunterName ?? 'Caçador anônimo'}</Title>
          </View>
        </View>

        <View style={styles.nivelRow}>
          <View style={styles.nivelEsq}>
            <Icon name={ICON.nivel} size={15} color={colors.gold} />
            <Text style={styles.nivelTexto}>Nível {stats.level}</Text>
          </View>
          <Mono>
            {stats.xpIntoLevel} / {stats.xpForNextLevel} XP
          </Mono>
        </View>
        <ProgressBar value={stats.xpIntoLevel / stats.xpForNextLevel} />

        <Divider />

        <View style={styles.numeros}>
          <Numero valor={stats.total} rotulo="achados" icone={ICON.inventario} />
          <Numero valor={stats.stored} rotulo="guardados" icone="archive-outline" />
          <Numero
            valor={stats.returned}
            rotulo="devolvidos"
            icone={ICON.devolver}
            cor={colors.success}
          />
        </View>
      </Animated.View>

      {/* ---------------- coleção ---------------- */}

      <Animated.View entering={FadeInDown.delay(60).duration(300)}>
        <Card style={styles.cartao}>
          <View style={styles.tituloComIcone}>
            <Icon name={ICON.colecao} size={15} color={colors.gold} />
            <Label>Coleção de itens</Label>
          </View>

          <View style={styles.nivelRow}>
            <Body>Tipos diferentes já catalogados</Body>
            <Mono>
              {stats.discovered.size} / {CATALOG_SIZE}
            </Mono>
          </View>
          <ProgressBar value={stats.collectionProgress} />

          <Divider />

          <Label>Por raridade</Label>
          <View style={styles.raridades}>
            {RARITY_ORDER.map((raridade) => {
              const def = RARITIES[raridade];
              const quantos = stats.byRarity[raridade];
              return (
                <View
                  key={raridade}
                  style={[
                    styles.raridade,
                    { borderColor: def.color, backgroundColor: def.tint },
                    quantos > 0 && glow(def.color, 0.3),
                  ]}
                >
                  <Icon name={def.icon} size={14} color={def.color} />
                  <Text style={[styles.raridadeValor, { color: def.color }]}>{quantos}</Text>
                  <Text style={styles.raridadeRotulo}>{def.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      </Animated.View>

      {/* ---------------- identificacao ---------------- */}

      <Animated.View entering={FadeInDown.delay(90).duration(300)}>
        <Card style={styles.cartao}>
          <View style={styles.tituloComIcone}>
            <Icon name="robot-outline" size={15} color={colors.gold} />
            <Label>Identificação automática</Label>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setEscolhendoModelo(true)}
            style={({ pressed }) => [styles.escolhaModelo, pressed && styles.pressionado]}
          >
            <View style={styles.escolhaTextos}>
              <Text style={styles.modeloNome}>{modelo.nome}</Text>
              <Mono style={styles.modeloFornecedor}>
                {modelo.fornecedor} · {modelo.gratuito ? 'grátis' : 'pago'}
              </Mono>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textFaint} />
          </Pressable>

          <Body style={styles.explicacao}>
            É o modelo que olha a foto e diz que item é. Se errar muito ou atingir o limite diário,
            escolha outro.
          </Body>
        </Card>
      </Animated.View>

      <SeletorModelo
        visivel={escolhendoModelo}
        selecionado={modelo.id}
        onFechar={() => setEscolhendoModelo(false)}
        onEscolher={async (escolhido) => {
          setModelo(await definirModelo(db, escolhido.id));
          setEscolhendoModelo(false);
          setAviso({ tom: 'info', texto: `Agora identificando com ${escolhido.nome}.` });
        }}
      />

      {/* ---------------- conta ---------------- */}

      <Animated.View entering={FadeInDown.delay(150).duration(300)}>
        <Card style={styles.cartao}>
          <View style={styles.tituloComIcone}>
            <Icon name="account-circle-outline" size={15} color={colors.gold} />
            <Label>Conta</Label>
          </View>

          {!configured ? (
            <Notice>
              Não foi possível conectar ao servidor. Seus itens continuam salvos neste aparelho e
              serão enviados quando a conexão voltar.
            </Notice>
          ) : (
            <>
              <View style={styles.linhaIcone}>
                <Icon name="email-outline" size={15} color={colors.textFaint} />
                <Body>{session?.user.email}</Body>
              </View>

              <TextField
                label="Nome de caçador"
                icon="account-outline"
                value={nome}
                onChangeText={setNome}
                placeholder="Como você aparece no mural"
              />
              <Button
                label="Salvar nome"
                icon={ICON.salvar}
                onPress={salvarNome}
                loading={salvandoNome}
                tone="ghost"
              />
              <Button label="Sair da conta" icon={ICON.sair} tone="danger" onPress={signOut} />
            </>
          )}
        </Card>
      </Animated.View>

      {/* ---------------- sincronização ---------------- */}

      <Animated.View entering={FadeInDown.delay(180).duration(300)}>
        <Card style={styles.cartao}>
          <View style={styles.tituloComIcone}>
            <Icon name={ICON.sincronizar} size={15} color={colors.gold} />
            <Label>Sincronização</Label>
          </View>

          <View style={styles.nivelRow}>
            <Body>Alterações pendentes</Body>
            <Mono style={pendingCount > 0 ? styles.pendente : undefined}>{pendingCount}</Mono>
          </View>

          <View style={styles.nivelRow}>
            <Body>Última sincronização</Body>
            <Mono>{ultimoSync ? ultimoSync.toLocaleString('pt-BR') : 'nunca'}</Mono>
          </View>

          <Button
            label="Sincronizar agora"
            icon={ICON.sincronizar}
            onPress={sincronizar}
            loading={sincronizando}
            disabled={!configured || !session}
          />

          {aviso ? <Notice tone={aviso.tom}>{aviso.texto}</Notice> : null}

          <Body style={styles.explicacao}>
            Seus itens ficam salvos no aparelho e continuam disponíveis mesmo sem internet. Os que
            você publicou no mural sobem sozinhos assim que houver conexão.
          </Body>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

function Numero({
  valor,
  rotulo,
  icone,
  cor,
}: {
  valor: number;
  rotulo: string;
  icone: React.ComponentProps<typeof Icon>['name'];
  cor?: string;
}) {
  return (
    <View style={styles.numero}>
      <Icon name={icone} size={16} color={cor ?? colors.gold} />
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
  brasao: {
    borderColor: colors.goldDim,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  brasaoTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  coroa: {
    alignItems: 'center',
    borderColor: colors.goldDim,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  brasaoTextos: {
    flex: 1,
    gap: 2,
  },
  cartao: {
    gap: spacing.md,
  },
  tituloComIcone: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nivelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nivelEsq: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  nivelTexto: {
    color: colors.text,
    fontFamily: font.display,
    fontSize: 15,
  },
  linhaIcone: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pendente: {
    color: colors.gold,
    fontFamily: font.monoBold,
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
    fontFamily: font.monoBold,
    fontSize: 22,
  },
  numeroRotulo: {
    color: colors.textFaint,
    fontFamily: font.mono,
    fontSize: 10,
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
    gap: 1,
    minWidth: 62,
    paddingVertical: spacing.sm,
  },
  raridadeValor: {
    fontFamily: font.monoBold,
    fontSize: 16,
  },
  raridadeRotulo: {
    color: colors.textFaint,
    fontFamily: font.mono,
    fontSize: 8.5,
  },
  explicacao: {
    fontSize: 12,
    lineHeight: 18,
  },
  escolhaModelo: {
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  pressionado: {
    opacity: 0.7,
  },
  escolhaTextos: {
    flex: 1,
    gap: 2,
  },
  modeloNome: {
    color: colors.text,
    fontFamily: font.display,
    fontSize: 16,
  },
  modeloFornecedor: {
    fontSize: 11,
  },
});
