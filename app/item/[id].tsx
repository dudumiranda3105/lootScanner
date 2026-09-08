import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { tempoRelativo } from '../../src/components/LootCard';
import { Notice, SyncPill, TextField, Toggle } from '../../src/components/form';
import {
  Body,
  Button,
  Card,
  Divider,
  EmptyState,
  Label,
  RarityBadge,
  Subtitle,
  Title,
} from '../../src/components/ui';
import { CATEGORIES, RARITIES } from '../../src/domain/rarity';
import { useAuth } from '../../src/hooks/useAuth';
import { RETURN_BONUS_XP, useInventory } from '../../src/hooks/useInventory';
import { colors, font, radius, spacing } from '../../src/theme/theme';

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
          emblem="🕳️"
          title="Item não encontrado"
          description="Este registro pode ter sido excluído do inventário."
        />
        <Button label="Voltar ao inventário" tone="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const raridade = RARITIES[item.rarity];
  const devolvido = item.status === 'devolvido';
  const alterado = nome !== item.name || local !== item.foundAt || nota !== item.note;

  const salvarEdicao = async () => {
    await updateItem(item.id, {
      name: nome.trim() || item.name,
      foundAt: local.trim(),
      note: nota.trim(),
    });
    setSalvo(true);
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

        <Card style={[styles.ficha, { borderColor: raridade.color, backgroundColor: raridade.tint }]}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.foto} resizeMode="cover" />
          ) : (
            <View style={[styles.foto, styles.fotoVazia]}>
              <Text style={styles.emblema}>{item.emblem}</Text>
            </View>
          )}

          <Title style={styles.nome}>
            {item.emblem} {item.name}
          </Title>

          <View style={styles.selos}>
            <RarityBadge rarity={item.rarity} />
            <SyncPill state={item.syncState} shared={item.shared} />
          </View>

          <Divider />

          <Linha rotulo="Categoria" valor={CATEGORIES[item.category].label} />
          <Linha rotulo="Onde foi achado" valor={item.foundAt || '—'} />
          <Linha rotulo="Registrado" valor={tempoRelativo(item.createdAt)} />
          <Linha
            rotulo="Identificação"
            valor={`${Math.round(item.confidence * 100)}% de confiança`}
          />
          <Linha rotulo="XP do item" valor={`${raridade.xp} XP`} />
          {devolvido && item.returnedAt ? (
            <Linha rotulo="Devolvido" valor={tempoRelativo(item.returnedAt)} />
          ) : null}
        </Card>

        {/* ---------------- devolução ---------------- */}

        <Button
          label={devolvido ? 'Desfazer devolução' : `Marcar como devolvido (+${RETURN_BONUS_XP} XP)`}
          tone={devolvido ? 'ghost' : 'primary'}
          onPress={() => toggleReturned(item.id)}
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

          <Button label="Salvar alterações" onPress={salvarEdicao} disabled={!alterado} />
          {salvo && !alterado ? <Notice>Alterações salvas no banco local.</Notice> : null}
        </Card>

        <Button label="Excluir item" tone="danger" onPress={confirmarExclusao} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Label>{rotulo}</Label>
      <Body style={styles.linhaValor}>{valor}</Body>
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
    gap: spacing.md,
  },
  cartao: {
    gap: spacing.md,
  },
  foto: {
    alignSelf: 'center',
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 200,
    width: '100%',
  },
  fotoVazia: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  emblema: {
    fontSize: 64,
  },
  nome: {
    fontSize: 22,
  },
  selos: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  linha: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  linhaValor: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: font.mono,
    fontSize: 12,
    textAlign: 'right',
  },
});
