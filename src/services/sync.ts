import type { SQLiteDatabase } from 'expo-sqlite';

import * as repo from '../db/lootRepo';
import { CategoryId, LootItem, LootStatus, MuralItem, RarityId } from '../domain/types';
import { isSupabaseConfigured, supabase, traduzErro } from './supabase';

export const LAST_SYNC_KEY = 'last_sync_at';

export interface SyncResult {
  ok: boolean;
  enviados: number;
  removidos: number;
  recebidos: number;
  /** Mensagem em português quando algo impediu a sincronização. */
  erro: string | null;
}

/** Linha da view `mural_view` no PostgreSQL. */
interface MuralRow {
  id: string;
  owner_id: string;
  finder_name: string | null;
  catalog_id: string;
  name: string;
  category: string;
  rarity: string;
  emblem: string;
  found_at: string | null;
  note: string | null;
  status: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Converte um item local no formato da tabela `loot_items` do PostgreSQL. */
function toRemotePayload(item: LootItem, ownerId: string) {
  return {
    owner_id: ownerId,
    local_id: item.id,
    catalog_id: item.catalogId,
    name: item.name,
    category: item.category,
    rarity: item.rarity,
    emblem: item.emblem,
    found_at: item.foundAt,
    note: item.note,
    status: item.status,
    updated_at: new Date(item.updatedAt).toISOString(),
  };
}

function rowToMuralItem(row: MuralRow): MuralItem {
  return {
    remoteId: row.id,
    ownerId: row.owner_id,
    finderName: row.finder_name ?? 'Caçador anônimo',
    catalogId: row.catalog_id,
    name: row.name,
    category: row.category as CategoryId,
    rarity: row.rarity as RarityId,
    emblem: row.emblem,
    foundAt: row.found_at ?? '',
    note: row.note ?? '',
    status: row.status as LootStatus,
    photoUrl: row.photo_url,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

/**
 * Envia o que está pendente e traz o mural de volta.
 *
 * O SQLite é a fonte da verdade: nada é apagado localmente antes de o servidor
 * confirmar. A função nunca lança — sem internet ou sem login ela apenas devolve
 * o motivo, e o app segue funcionando offline.
 */
export async function syncNow(db: SQLiteDatabase, ownerId: string | null): Promise<SyncResult> {
  const vazio: SyncResult = { ok: false, enviados: 0, removidos: 0, recebidos: 0, erro: null };

  if (!isSupabaseConfigured || !supabase) {
    return { ...vazio, erro: 'Supabase não configurado (falta o arquivo .env).' };
  }
  if (!ownerId) {
    return { ...vazio, erro: 'Entre na sua conta para usar o mural.' };
  }

  let enviados = 0;
  let removidos = 0;

  try {
    /* ---- 1. Sobem os itens publicados que ainda estão pendentes ---- */
    const uploads = await repo.pendingUploads(db);

    for (const item of uploads) {
      const { data, error } = await supabase
        .from('loot_items')
        .upsert(toRemotePayload(item, ownerId), { onConflict: 'owner_id,local_id' })
        .select('id')
        .single();

      if (error) throw error;
      await repo.markSynced(db, item.id, data.id as string);
      enviados += 1;
    }

    /* ---- 2. Saem do mural os itens que o usuário despublicou ---- */
    for (const item of await repo.pendingUnshares(db)) {
      const { error } = await supabase
        .from('loot_items')
        .delete()
        .eq('owner_id', ownerId)
        .eq('local_id', item.id);

      if (error) throw error;
      await repo.markSynced(db, item.id, null);
      removidos += 1;
    }

    /* ---- 3. Somem de vez os itens excluídos (lápides) ---- */
    for (const item of await repo.pendingDeletions(db)) {
      const { error } = await supabase
        .from('loot_items')
        .delete()
        .eq('owner_id', ownerId)
        .eq('local_id', item.id);

      if (error) throw error;
      await repo.purgeItem(db, item.id);
      removidos += 1;
    }

    /* ---- 4. Desce o mural coletivo para o cache local ---- */
    const { data, error } = await supabase
      .from('mural_view')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const mural = (data as MuralRow[]).map(rowToMuralItem);
    await repo.replaceMuralCache(db, mural);
    await repo.setMeta(db, LAST_SYNC_KEY, String(Date.now()));

    return { ok: true, enviados, removidos, recebidos: mural.length, erro: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[sync] falhou:', message);
    return { ok: false, enviados, removidos, recebidos: 0, erro: traduzErro(message) };
  }
}

/** Data do último sync bem-sucedido, ou `null` se nunca houve um. */
export async function lastSyncAt(db: SQLiteDatabase): Promise<Date | null> {
  const raw = await repo.getMeta(db, LAST_SYNC_KEY);
  if (!raw) return null;
  const millis = Number(raw);
  return Number.isFinite(millis) ? new Date(millis) : null;
}
