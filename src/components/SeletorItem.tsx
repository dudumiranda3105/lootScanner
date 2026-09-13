import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { CATALOG, catalogRarity } from '../domain/catalog';
import { CATEGORIES, CATEGORY_ORDER, RARITIES } from '../domain/rarity';
import { CatalogEntry } from '../domain/types';
import { colors, font, radius, spacing } from '../theme/theme';
import { TextField } from './form';
import { ICON } from './icons';
import { Button, Icon, Label, RarityBadge, Subtitle } from './ui';

/** Remove acentos, para "lapis" encontrar "Lápis". */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Lista completa do catálogo, para o usuário escolher na mão.
 *
 * É a rede de segurança da identificação automática: nenhum modelo acerta
 * sempre, e sem isto um palpite errado deixaria o item com categoria, raridade
 * e ícone errados para sempre — os dois primeiros contam para o XP e para a
 * coleção, então não é só cosmético.
 */
export function SeletorItem({
  visivel,
  selecionado,
  onEscolher,
  onFechar,
}: {
  visivel: boolean;
  selecionado: string;
  onEscolher: (entrada: CatalogEntry) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState('');

  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());

    const itens = CATALOG.filter((entrada) => {
      if (entrada.id === 'desconhecido') return false;
      if (!termo) return true;
      return (
        normalizar(entrada.name).includes(termo) ||
        normalizar(CATEGORIES[entrada.category].label).includes(termo) ||
        entrada.keywords.some((palavra) => normalizar(palavra).includes(termo))
      );
    });

    // Agrupado por categoria: procurar "aquele item de eletrônico" é tão comum
    // quanto lembrar o nome exato.
    return CATEGORY_ORDER.flatMap((categoria) => {
      const doGrupo = itens.filter((entrada) => entrada.category === categoria);
      if (doGrupo.length === 0) return [];
      return [{ tipo: 'titulo' as const, categoria }, ...doGrupo.map((entrada) => ({ tipo: 'item' as const, entrada }))];
    });
  }, [busca]);

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={onFechar} statusBarTranslucent>
      <View style={styles.tela}>
        <View style={styles.cabecalho}>
          <Subtitle>Escolher item</Subtitle>
          <TextField
            icon={ICON.buscar}
            placeholder="Buscar no catálogo…"
            value={busca}
            onChangeText={setBusca}
            autoCorrect={false}
            autoFocus
          />
        </View>

        <FlatList
          data={resultados}
          keyExtractor={(linha) => (linha.tipo === 'titulo' ? 'g-' + linha.categoria : linha.entrada.id)}
          contentContainerStyle={styles.lista}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: linha }) => {
            if (linha.tipo === 'titulo') {
              return <Label style={styles.grupo}>{CATEGORIES[linha.categoria].label}</Label>;
            }

            const { entrada } = linha;
            const raridade = RARITIES[catalogRarity(entrada.id)];
            const ativo = entrada.id === selecionado;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                onPress={() => onEscolher(entrada)}
                style={({ pressed }) => [
                  styles.linha,
                  ativo && { borderColor: raridade.color, backgroundColor: raridade.tint },
                  pressed && styles.pressionado,
                ]}
              >
                <Icon name={entrada.icon} size={22} color={raridade.color} />
                <Text style={styles.nome}>{entrada.name}</Text>
                <RarityBadge rarity={catalogRarity(entrada.id)} size="sm" />
                {ativo ? <Icon name="check" size={17} color={raridade.color} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhum item com esse nome.</Text>}
        />

        <View style={styles.rodape}>
          <Button label="Cancelar" tone="ghost" onPress={onFechar} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tela: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  cabecalho: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
  },
  lista: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  grupo: {
    marginTop: spacing.md,
  },
  linha: {
    alignItems: 'center',
    backgroundColor: colors.surface,
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
  nome: {
    color: colors.text,
    flex: 1,
    fontFamily: font.display,
    fontSize: 15,
  },
  vazio: {
    color: colors.textFaint,
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
  rodape: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg,
  },
});
