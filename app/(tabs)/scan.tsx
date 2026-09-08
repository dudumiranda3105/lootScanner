import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Notice, TextField, Toggle } from '../../src/components/form';
import { Body, Button, Card, Chip, Divider, Label, RarityBadge, Subtitle, Title } from '../../src/components/ui';
import { catalogRarity, getCatalogEntry } from '../../src/domain/catalog';
import { CATEGORIES, RARITIES } from '../../src/domain/rarity';
import { VisionResult } from '../../src/domain/types';
import { useAuth } from '../../src/hooks/useAuth';
import { useInventory } from '../../src/hooks/useInventory';
import { identifyItem } from '../../src/services/vision';
import { colors, font, radius, spacing } from '../../src/theme/theme';

type Etapa = 'camera' | 'analisando' | 'confirmar';

export default function EscanearScreen() {
  const { addItem } = useInventory();
  const { session, configured } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);

  const [etapa, setEtapa] = useState<Etapa>('camera');
  const [foto, setFoto] = useState<string | null>(null);
  const [resultado, setResultado] = useState<VisionResult | null>(null);
  const [catalogId, setCatalogId] = useState('desconhecido');
  const [nome, setNome] = useState('');
  const [local, setLocal] = useState('');
  const [nota, setNota] = useState('');
  const [publicar, setPublicar] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const reiniciar = useCallback(() => {
    setEtapa('camera');
    setFoto(null);
    setResultado(null);
    setCatalogId('desconhecido');
    setNome('');
    setLocal('');
    setNota('');
    setSalvando(false);
  }, []);

  // Sair da aba e voltar recomeça o fluxo, em vez de reabrir um rascunho antigo.
  useFocusEffect(
    useCallback(() => {
      return () => reiniciar();
    }, [reiniciar]),
  );

  /** Foto capturada -> identificação -> tela de confirmação. */
  const analisar = useCallback(async (uri: string, base64: string | null) => {
    setFoto(uri);
    setEtapa('analisando');

    const encontrado = await identifyItem({ uri, base64 });
    const melhor = encontrado.guesses[0];
    const entrada = getCatalogEntry(melhor.catalogId);

    setResultado(encontrado);
    setCatalogId(entrada.id);
    setNome(entrada.name);
    setEtapa('confirmar');

    // Itens raros merecem uma vibração mais forte — é a graça do "loot".
    const raridade = catalogRarity(entrada.id);
    void Haptics.notificationAsync(
      raridade === 'lendario' || raridade === 'epico'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
  }, []);

  const fotografar = useCallback(async () => {
    const captura = await camera.current?.takePictureAsync({ quality: 0.6, base64: true });
    if (captura?.uri) await analisar(captura.uri, captura.base64 ?? null);
  }, [analisar]);

  const escolherDaGaleria = useCallback(async () => {
    const escolha = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    const asset = escolha.assets?.[0];
    if (!escolha.canceled && asset) await analisar(asset.uri, asset.base64 ?? null);
  }, [analisar]);

  const salvar = useCallback(async () => {
    setSalvando(true);
    try {
      const item = await addItem({
        catalogId,
        name: nome,
        photoUri: foto,
        foundAt: local,
        note: nota,
        confidence: resultado?.guesses[0]?.confidence ?? 0,
        shared: publicar,
      });
      reiniciar();
      router.push({ pathname: '/item/[id]', params: { id: item.id } });
    } catch (error) {
      console.warn('[scan] não foi possível salvar o item:', error);
      setSalvando(false);
    }
  }, [addItem, catalogId, nome, foto, local, nota, resultado, publicar, reiniciar]);

  /* ---------------- permissão da câmera ---------------- */

  if (!permission) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!permission.granted && etapa === 'camera') {
    return (
      <View style={styles.centro}>
        <Text style={styles.emblemaGrande}>📷</Text>
        <Subtitle style={styles.textoCentro}>Precisamos da câmera</Subtitle>
        <Body style={styles.textoCentro}>
          O LootScanner usa a câmera para fotografar o objeto achado e registrá-lo no inventário.
        </Body>
        <Button label="Permitir câmera" onPress={requestPermission} />
        <Button label="Escolher da galeria" tone="ghost" onPress={escolherDaGaleria} />
      </View>
    );
  }

  /* ---------------- analisando ---------------- */

  if (etapa === 'analisando') {
    return (
      <View style={styles.centro}>
        {foto ? <Image source={{ uri: foto }} style={styles.previaAnalise} /> : null}
        <ActivityIndicator color={colors.gold} size="large" />
        <Subtitle style={styles.textoCentro}>Identificando o loot…</Subtitle>
        <Body style={styles.textoCentro}>Comparando com o catálogo de itens conhecidos.</Body>
      </View>
    );
  }

  /* ---------------- confirmação ---------------- */

  if (etapa === 'confirmar') {
    const entrada = getCatalogEntry(catalogId);
    const raridade = catalogRarity(catalogId);
    const confianca = Math.round((resultado?.guesses[0]?.confidence ?? 0) * 100);

    // Palpites alternativos, para corrigir a sugestão com um toque.
    const alternativas = (resultado?.guesses ?? []).filter((g) => g.catalogId !== catalogId);

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.tela}
      >
        <ScrollView contentContainerStyle={styles.formulario} keyboardShouldPersistTaps="handled">
          <Card style={[styles.achado, { borderColor: RARITIES[raridade].color }]}>
            <Label>Loot encontrado</Label>

            <View style={styles.achadoRow}>
              {foto ? (
                <Image source={{ uri: foto }} style={styles.previa} />
              ) : (
                <View style={styles.previa}>
                  <Text style={styles.emblemaGrande}>{entrada.emblem}</Text>
                </View>
              )}

              <View style={styles.achadoTextos}>
                <Title style={styles.achadoNome}>
                  {entrada.emblem} {entrada.name}
                </Title>
                <RarityBadge rarity={raridade} />
                <Body style={styles.achadoCategoria}>
                  {CATEGORIES[entrada.category].label} · {confianca}% de confiança
                </Body>
              </View>
            </View>

            {alternativas.length > 0 ? (
              <>
                <Divider />
                <Label>Não é isso? Troque:</Label>
                <View style={styles.alternativas}>
                  {alternativas.map((palpite) => {
                    const outro = getCatalogEntry(palpite.catalogId);
                    return (
                      <Chip
                        key={outro.id}
                        label={`${outro.emblem} ${outro.name}`}
                        selected={false}
                        onPress={() => {
                          setCatalogId(outro.id);
                          setNome(outro.name);
                        }}
                      />
                    );
                  })}
                </View>
              </>
            ) : null}
          </Card>

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

          <Toggle
            title="Publicar no mural coletivo"
            description={
              configured
                ? 'Quem perdeu o objeto consegue encontrar o registro pelo app.'
                : 'Supabase ainda não configurado — o item fica só neste aparelho.'
            }
            value={publicar}
            onChange={setPublicar}
            disabled={!configured}
          />

          {publicar && configured && !session ? (
            <Notice>
              Você ainda não entrou na sua conta. O item fica guardado como pendente e sobe para o
              mural assim que você fizer login.
            </Notice>
          ) : null}

          <Button label="Guardar no inventário" onPress={salvar} loading={salvando} />
          <Button label="Descartar e escanear de novo" tone="ghost" onPress={reiniciar} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ---------------- câmera ---------------- */

  return (
    <View style={styles.tela}>
      <CameraView ref={camera} style={styles.camera} facing="back">
        <View style={styles.mira}>
          <View style={styles.miraQuadro} />
          <Text style={styles.miraTexto}>Enquadre o objeto achado</Text>
        </View>
      </CameraView>

      <View style={styles.controles}>
        <Pressable
          accessibilityLabel="Escolher foto da galeria"
          accessibilityRole="button"
          onPress={escolherDaGaleria}
          style={({ pressed }) => [styles.botaoLateral, pressed && styles.pressionado]}
        >
          <Text style={styles.botaoLateralTexto}>🖼️</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Escanear item"
          accessibilityRole="button"
          onPress={fotografar}
          style={({ pressed }) => [styles.obturador, pressed && styles.pressionado]}
        >
          <View style={styles.obturadorMiolo} />
        </Pressable>

        <View style={styles.botaoLateral} />
      </View>
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
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  textoCentro: {
    textAlign: 'center',
  },
  emblemaGrande: {
    fontSize: 44,
  },
  camera: {
    flex: 1,
  },
  mira: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  miraQuadro: {
    borderColor: colors.gold,
    borderRadius: radius.lg,
    borderWidth: 2,
    height: 240,
    opacity: 0.8,
    width: 240,
  },
  miraTexto: {
    color: colors.text,
    fontFamily: font.mono,
    fontSize: 12,
    textShadowColor: '#000',
    textShadowRadius: 6,
  },
  controles: {
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  botaoLateral: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  botaoLateralTexto: {
    fontSize: 26,
  },
  obturador: {
    alignItems: 'center',
    borderColor: colors.gold,
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  obturadorMiolo: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    height: 58,
    width: 58,
  },
  pressionado: {
    opacity: 0.6,
  },
  previaAnalise: {
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 200,
    width: 200,
  },
  formulario: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  achado: {
    gap: spacing.md,
  },
  achadoRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  previa: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  achadoTextos: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  achadoNome: {
    fontSize: 20,
  },
  achadoCategoria: {
    fontSize: 12,
  },
  alternativas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
