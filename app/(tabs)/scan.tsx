import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Notice, TextField, Toggle } from '../../src/components/form';
import { ICON } from '../../src/components/icons';
import {
  Body,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  Label,
  Mono,
  RarityBadge,
  Subtitle,
  Title,
} from '../../src/components/ui';
import { catalogRarity, getCatalogEntry } from '../../src/domain/catalog';
import { CATEGORIES, RARITIES } from '../../src/domain/rarity';
import { VisionResult } from '../../src/domain/types';
import { useAuth } from '../../src/hooks/useAuth';
import { useInventory } from '../../src/hooks/useInventory';
import { identifyItem } from '../../src/services/vision';
import { colors, font, glow, radius, spacing } from '../../src/theme/theme';

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
    const entrada = getCatalogEntry(encontrado.guesses[0].catalogId);

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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        <View style={styles.anelGrande}>
          <Icon name={ICON.escanear} size={40} color={colors.gold} />
        </View>
        <Subtitle style={styles.textoCentro}>Precisamos da câmera</Subtitle>
        <Body style={styles.textoCentro}>
          O LootScanner usa a câmera para fotografar o objeto achado e registrá-lo no inventário.
        </Body>
        <Button label="Permitir câmera" icon="camera" onPress={requestPermission} />
        <Button
          label="Escolher da galeria"
          icon={ICON.galeria}
          tone="ghost"
          onPress={escolherDaGaleria}
        />
      </View>
    );
  }

  /* ---------------- analisando ---------------- */

  if (etapa === 'analisando') return <Analisando foto={foto} />;

  /* ---------------- confirmação ---------------- */

  if (etapa === 'confirmar') {
    const entrada = getCatalogEntry(catalogId);
    const raridade = catalogRarity(catalogId);
    const def = RARITIES[raridade];
    const confianca = Math.round((resultado?.guesses[0]?.confidence ?? 0) * 100);

    // Palpites alternativos, para corrigir a sugestão com um toque.
    const alternativas = (resultado?.guesses ?? []).filter((g) => g.catalogId !== catalogId);

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.tela}
      >
        <ScrollView contentContainerStyle={styles.formulario} keyboardShouldPersistTaps="handled">
          <Animated.View
            entering={ZoomIn.duration(320)}
            style={[styles.achado, { borderColor: def.color }, glow(def.color, 0.45)]}
          >
            <LinearGradient
              colors={[`${def.color}2E`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <Label>Loot encontrado</Label>

            <View style={styles.achadoRow}>
              <View style={[styles.previa, { borderColor: def.color }]}>
                {foto ? (
                  <Image source={{ uri: foto }} style={styles.previaImagem} contentFit="cover" />
                ) : (
                  <Icon name={entrada.icon} size={40} color={def.color} />
                )}
              </View>

              <View style={styles.achadoTextos}>
                <View style={styles.achadoNomeLinha}>
                  <Icon name={entrada.icon} size={19} color={def.color} />
                  <Title style={styles.achadoNome} numberOfLines={2}>
                    {entrada.name}
                  </Title>
                </View>
                <RarityBadge rarity={raridade} />
                <Mono style={styles.achadoCategoria}>
                  {CATEGORIES[entrada.category].label} · {confianca}% de confiança
                </Mono>
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
                        label={outro.name}
                        icon={outro.icon}
                        selected={false}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setCatalogId(outro.id);
                          setNome(outro.name);
                        }}
                      />
                    );
                  })}
                </View>
              </>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeIn.delay(160).duration(260)} style={styles.campos}>
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

            <Button
              label="Guardar no inventário"
              icon={ICON.inventario}
              onPress={salvar}
              loading={salvando}
            />
            <Button label="Escanear de novo" icon="camera" tone="ghost" onPress={reiniciar} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ---------------- câmera ---------------- */

  return (
    <View style={styles.tela}>
      <CameraView ref={camera} style={styles.camera} facing="back">
        <View style={styles.mira}>
          <View style={styles.miraQuadro}>
            <Canto style={styles.cantoTL} />
            <Canto style={styles.cantoTR} />
            <Canto style={styles.cantoBL} />
            <Canto style={styles.cantoBR} />
          </View>
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
          <Icon name={ICON.galeria} size={26} color={colors.textMuted} />
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

/** Canto decorativo da mira, no estilo de visor. */
function Canto({ style }: { style: object }) {
  return <View style={[styles.canto, style]} />;
}

/** Tela de análise: um anel pulsando em volta da foto enquanto o item é identificado. */
function Analisando({ foto }: { foto: string | null }) {
  const pulso = useSharedValue(0);

  useEffect(() => {
    pulso.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, [pulso]);

  const anel = useAnimatedStyle(() => ({
    opacity: 1 - pulso.value,
    transform: [{ scale: 1 + pulso.value * 0.35 }],
  }));

  return (
    <View style={styles.centro}>
      <View style={styles.analiseCaixa}>
        <Animated.View style={[styles.analiseAnel, anel]} />
        {foto ? (
          <Image source={{ uri: foto }} style={styles.analiseFoto} contentFit="cover" />
        ) : (
          <View style={styles.analiseFoto} />
        )}
      </View>

      <Subtitle style={styles.textoCentro}>Identificando o loot…</Subtitle>
      <Body style={styles.textoCentro}>Comparando com o catálogo de itens conhecidos.</Body>
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
  anelGrande: {
    alignItems: 'center',
    borderColor: colors.goldDim,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 88,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 88,
  },
  camera: {
    flex: 1,
  },
  mira: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  miraQuadro: {
    height: 240,
    width: 240,
  },
  canto: {
    borderColor: colors.gold,
    height: 30,
    position: 'absolute',
    width: 30,
  },
  cantoTL: { borderLeftWidth: 3, borderTopLeftRadius: radius.md, borderTopWidth: 3, left: 0, top: 0 },
  cantoTR: {
    borderRightWidth: 3,
    borderTopRightRadius: radius.md,
    borderTopWidth: 3,
    right: 0,
    top: 0,
  },
  cantoBL: {
    borderBottomLeftRadius: radius.md,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 0,
    left: 0,
  },
  cantoBR: {
    borderBottomRightRadius: radius.md,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 0,
    right: 0,
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
  analiseCaixa: {
    alignItems: 'center',
    height: 200,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 200,
  },
  analiseAnel: {
    borderColor: colors.gold,
    borderRadius: radius.lg,
    borderWidth: 2,
    height: 200,
    position: 'absolute',
    width: 200,
  },
  analiseFoto: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 180,
    width: 180,
  },
  formulario: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  campos: {
    gap: spacing.lg,
  },
  achado: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  achadoRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  previa: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  previaImagem: {
    height: '100%',
    width: '100%',
  },
  achadoTextos: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  achadoNomeLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  achadoNome: {
    flex: 1,
    fontSize: 19,
  },
  achadoCategoria: {
    fontSize: 11,
  },
  alternativas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
