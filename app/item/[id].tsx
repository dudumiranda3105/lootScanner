import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { tempoRelativo } from '../../src/components/LootCard';
import { Notice, SyncPill, TextField, Toggle } from '../../src/components/form';
import { ICON, IconName } from '../../src/components/icons';
import {
  Body,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  Label,
  Mono,
  RarityBadge,
  Subtitle,
  Title,
} from '../../src/components/ui';
import { getCatalogEntry } from '../../src/domain/catalog';
import { CATEGORIES, RARITIES } from '../../src/domain/rarity';
import { useAuth } from '../../src/hooks/useAuth';
import { RETURN_BONUS_XP, useInventory } from '../../src/hooks/useInventory';
import { colors, font, glow, radius, spacing } from '../../src/theme/theme';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, updateItem, toggleReturned, setShared, removeItem } = useInventory();
  const { configured } = useAuth();

  const item = useMemo(() => items.find((candidato) => candidato.id === id), [items, id]);

  const [nome, setNome] = useState('');
  const [local, setLocal] = useState('');
  const [nota, setNota] = useState('');
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!item) return;
    setNome(item.name);
    setLocal(item.foundAt);
    setNota(item.note);
  }, [item?.id]);

  if (!item) {
    return (
      <View style={styles.centro}>
        <EmptyState
          icon="image-off-outline"
          title="Item não encontrado"
          description="Este registro pode ter sido excluído do inventário."
        />
        <Button label="Voltar ao inventário" tone="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const entrada = getCatalogEntry(item.catalogId);
  const raridade = RARITIES[item.rarity];
  const devolvido = item.status === 'devolvido';
  const alterado = nome !== item.name || local !== item.foundAt || nota !== item.note;

  const salvarEdicao = async () => {
    await updateItem(item.id, {
      name: nome.trim() || item.name,
      foundAt: local.trim(),
      note: nota.trim(),
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSalvo(true);
  };

  const alternarDevolucao = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void toggleReturned(item.id);
  };

  const confirmarExclusao = () => {
    Alert.alert(
      'Excluir item',
      `"${item.name}" será removido do inventário e do mural. Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await removeItem(item.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.tela}
    >
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {/* ---------------- ficha ---------------- */}

        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.ficha, { borderColor: raridade.color }, glow(raridade.color, 0.4)]}
        >
          <LinearGradient
            colors={[`${raridade.color}24`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.fotoCaixa, { borderColor: raridade.color }]}>
            {item.photoUri ? (
              <Image
                source={{ uri: item.photoUri }}
                style={styles.foto}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Icon name={entrada.icon} size={72} color={raridade.color} />
            )}
          </View>

          <View style={styles.nomeLinha}>
            <Icon name={entrada.icon} size={22} color={raridade.color} />
            <Title style={styles.nome}>{item.name}</Title>
          </View>

          <View style={styles.selos}>
            <RarityBadge rarity={item.rarity} />
            <SyncPill state={item.syncState} shared={item.shared} />
          </View>

          <Divider />

          <Linha icone={ICON.categoria} rotulo="Categoria" valor={CATEGORIES[item.category].label} />
          <Linha icone={ICON.local} rotulo="Onde foi achado" valor={item.foundAt || '—'} />
          <Linha icone={ICON.relogio} rotulo="Registrado" valor={tempoRelativo(item.createdAt)} />
          <Linha
            icone={ICON.confianca}
            rotulo="Identificação"
            valor={`${Math.round(item.confidence * 100)}% de confiança`}
          />
          <Linha icone={ICON.nivel} rotulo="XP do item" valor={`${raridade.xp} XP`} />
          {devolvido && item.returnedAt ? (
            <Linha
              icone={ICON.devolver}
              rotulo="Devolvido"
              valor={tempoRelativo(item.returnedAt)}
            />
          ) : null}
        </Animated.View>

        {/* ---------------- devolução ---------------- */}

        <Button
          label={devolvido ? 'Desfazer devolução' : `Marcar como devolvido (+${RETURN_BONUS_XP} XP)`}
          icon={ICON.devolver}
          tone={devolvido ? 'ghost' : 'primary'}
          onPress={alternarDevolucao}
        />

        {/* ---------------- mural ---------------- */}

        <Toggle
          title="Publicar no mural coletivo"
          description={
            configured
              ? 'Aparece no mural para quem estiver procurando o objeto perdido.'
              : 'Supabase ainda não configurado — o item fica só neste aparelho.'
          }
          value={item.shared}
          onChange={(valor) => setShared(item.id, valor)}
          disabled={!configured}
        />

        {/* ---------------- edição ---------------- */}

        <Card style={styles.cartao}>
          <Subtitle>Editar registro</Subtitle>

          <TextField label="Nome do item" value={nome} onChangeText={setNome} />
          <TextField
            label="Onde você encontrou"
            icon={ICON.local}
            placeholder="Sala 203, refeitório, quadra…"
            value={local}
            onChangeText={setLocal}
          />
          <TextField
            label="Observação"
            placeholder="Cor, marca, sinal para identificar o dono…"
            value={nota}
            onChangeText={setNota}
            multiline
          />

          <Button
            label="Salvar alterações"
            icon={ICON.salvar}
            onPress={salvarEdicao}
            disabled={!alterado}
          />
          {salvo && !alterado ? <Notice>Alterações salvas no banco local.</Notice> : null}
        </Card>

        <Button
          label="Excluir item"
          icon={ICON.excluir}
          tone="danger"
          onPress={confirmarExclusao}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Linha({ icone, rotulo, valor }: { icone: IconName; rotulo: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <View style={styles.linhaEsq}>
        <Icon name={icone} size={13} color={colors.textFaint} />
        <Label>{rotulo}</Label>
      </View>
      <Mono style={styles.linhaValor}>{valor}</Mono>
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
  conteudo: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  ficha: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  cartao: {
    gap: spacing.md,
  },
  fotoCaixa: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 210,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  foto: {
    height: '100%',
    width: '100%',
  },
  nomeLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nome: {
    flex: 1,
    fontSize: 21,
  },
  selos: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  linha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  linhaEsq: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  linhaValor: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: font.mono,
    textAlign: 'right',
  },
});
