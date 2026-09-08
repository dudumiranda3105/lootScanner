import { useSQLiteContext } from 'expo-sqlite';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as repo from '../db/lootRepo';
import { catalogRarity, getCatalogEntry, CATALOG_SIZE } from '../domain/catalog';
import { RARITIES, RARITY_ORDER } from '../domain/rarity';
import { LootItem, RarityId } from '../domain/types';
import { deletePhoto, persistPhoto } from '../services/photos';

/** Bônus de XP concedido quando o item é devolvido ao dono. */
export const RETURN_BONUS_XP = 30;

export interface NewLootDraft {
  catalogId: string;
  /** Nome editado pelo usuário; vazio usa o nome do catálogo. */
  name?: string;
  photoUri: string | null;
  foundAt: string;
  note: string;
  confidence: number;
  /** Publicar no mural coletivo assim que houver login e internet. */
  shared: boolean;
}

export interface InventoryStats {
  total: number;
  returned: number;
  stored: number;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  byRarity: Record<RarityId, number>;
  discovered: Set<string>;
  collectionProgress: number;
}

interface InventoryContextValue {
  items: LootItem[];
  loading: boolean;
  stats: InventoryStats;
  /** Quantas alterações locais ainda não chegaram ao Supabase. */
  pendingCount: number;
  addItem: (draft: NewLootDraft) => Promise<LootItem>;
  updateItem: (id: string, patch: Partial<LootItem>) => Promise<void>;
  toggleReturned: (id: string) => Promise<void>;
  setShared: (id: string, shared: boolean) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  /** Relê o inventário do SQLite — usado depois de sincronizar. */
  refresh: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  // A conexão vem do <SQLiteProvider> montado no layout raiz.
  const db = useSQLiteContext();
  const [items, setItems] = useState<LootItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    const [stored, pending] = await Promise.all([repo.listItems(db), repo.countPending(db)]);
    setItems(stored);
    setPendingCount(pending);
  }, [db]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [stored, pending] = await Promise.all([repo.listItems(db), repo.countPending(db)]);
        if (!active) return;
        setItems(stored);
        setPendingCount(pending);
      } catch (error) {
        console.warn('[inventory] falha ao ler o banco local:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [db]);

  const addItem = useCallback(
    async (draft: NewLootDraft) => {
      const entry = getCatalogEntry(draft.catalogId);
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();

      // A câmera grava no cache; a foto é arquivada antes de o item ser salvo.
      const photoUri = draft.photoUri ? await persistPhoto(draft.photoUri, id) : null;

      const item: LootItem = {
        id,
        catalogId: entry.id,
        name: draft.name?.trim() || entry.name,
        category: entry.category,
        rarity: catalogRarity(entry.id),
        emblem: entry.emblem,
        photoUri,
        foundAt: draft.foundAt.trim(),
        note: draft.note.trim(),
        createdAt: now,
        updatedAt: now,
        status: 'guardado',
        returnedAt: null,
        confidence: draft.confidence,
        shared: draft.shared,
        syncState: 'pending',
        remoteId: null,
      };

      await repo.insertItem(db, item);
      setItems((current) => [item, ...current]);
      setPendingCount(await repo.countPending(db));

      return item;
    },
    [db],
  );

  /** Grava o patch no SQLite e reflete a mudança no estado em memória. */
  const applyPatch = useCallback(
    async (id: string, patch: Partial<LootItem>) => {
      const full: Partial<LootItem> = {
        ...patch,
        updatedAt: Date.now(),
        // Qualquer alteração volta a fila de envio.
        syncState: 'pending',
      };

      await repo.updateItem(db, id, full);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...full } : item)));
      setPendingCount(await repo.countPending(db));
    },
    [db],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<LootItem>) => applyPatch(id, patch),
    [applyPatch],
  );

  const toggleReturned = useCallback(
    async (id: string) => {
      const target = items.find((item) => item.id === id);
      if (!target) return;

      const returning = target.status === 'guardado';
      await applyPatch(id, {
        status: returning ? 'devolvido' : 'guardado',
        returnedAt: returning ? Date.now() : null,
      });
    },
    [items, applyPatch],
  );

  const setShared = useCallback(
    (id: string, shared: boolean) => applyPatch(id, { shared }),
    [applyPatch],
  );

  const removeItem = useCallback(
    async (id: string) => {
      const target = items.find((item) => item.id === id);

      await repo.deleteItem(db, id);
      if (target) void deletePhoto(target.photoUri);

      setItems((current) => current.filter((item) => item.id !== id));
      setPendingCount(await repo.countPending(db));
    },
    [db, items],
  );

  const stats = useMemo(() => computeStats(items), [items]);

  const value = useMemo(
    () => ({
      items,
      loading,
      stats,
      pendingCount,
      addItem,
      updateItem,
      toggleReturned,
      setShared,
      removeItem,
      refresh,
    }),
    [
      items,
      loading,
      stats,
      pendingCount,
      addItem,
      updateItem,
      toggleReturned,
      setShared,
      removeItem,
      refresh,
    ],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory precisa estar dentro de <InventoryProvider>.');
  return context;
}

function computeStats(items: LootItem[]): InventoryStats {
  const byRarity = RARITY_ORDER.reduce(
    (acc, rarity) => ({ ...acc, [rarity]: 0 }),
    {} as Record<RarityId, number>,
  );

  let xp = 0;
  let returned = 0;
  const discovered = new Set<string>();

  for (const item of items) {
    byRarity[item.rarity] += 1;
    xp += RARITIES[item.rarity].xp;
    if (item.status === 'devolvido') {
      returned += 1;
      xp += RETURN_BONUS_XP;
    }
    if (item.catalogId !== 'desconhecido') discovered.add(item.catalogId);
  }

  const { level, intoLevel, needed } = levelFromXp(xp);

  return {
    total: items.length,
    returned,
    stored: items.length - returned,
    xp,
    level,
    xpIntoLevel: intoLevel,
    xpForNextLevel: needed,
    byRarity,
    discovered,
    collectionProgress: CATALOG_SIZE === 0 ? 0 : discovered.size / CATALOG_SIZE,
  };
}

/** Curva de nível: cada nível custa 35% mais XP que o anterior. */
export function levelFromXp(xp: number) {
  let level = 1;
  let needed = 100;
  let remaining = xp;

  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = Math.round(needed * 1.35);
  }

  return { level, intoLevel: remaining, needed };
}
