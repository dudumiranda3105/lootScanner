import type { SQLiteDatabase } from 'expo-sqlite';

import { CategoryId, LootItem, LootStatus, MuralItem, RarityId, SyncState } from '../domain/types';

/* ------------------------------------------------------------------ *
 * Linhas do banco  <->  objetos do domínio
 * ------------------------------------------------------------------ */

interface LootRow {
  id: string;
  catalog_id: string;
  name: string;
  category: string;
  rarity: string;
  emblem: string;
  photo_uri: string | null;
  found_at: string;
  note: string;
  created_at: number;
  updated_at: number;
  status: string;
  returned_at: number | null;
  confidence: number;
  shared: number;
  sync_state: string;
  remote_id: string | null;
  deleted: number;
}

function rowToItem(row: LootRow): LootItem {
  return {
    id: row.id,
    catalogId: row.catalog_id,
    name: row.name,
    category: row.category as CategoryId,
    rarity: row.rarity as RarityId,
    emblem: row.emblem,
    photoUri: row.photo_uri,
    foundAt: row.found_at,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status as LootStatus,
    returnedAt: row.returned_at,
    confidence: row.confidence,
    shared: row.shared === 1,
    syncState: row.sync_state as SyncState,
    remoteId: row.remote_id,
  };
}

interface MuralRow {
  remote_id: string;
  owner_id: string;
  finder_name: string;
  name: string;
  category: string;
  rarity: string;
  emblem: string;
  found_at: string;
  note: string;
  status: string;
  photo_url: string | null;
  created_at: number;
  updated_at: number;
}

function rowToMural(row: MuralRow): MuralItem {
  return {
    remoteId: row.remote_id,
    ownerId: row.owner_id,
    finderName: row.finder_name,
    name: row.name,
    category: row.category as CategoryId,
    rarity: row.rarity as RarityId,
    emblem: row.emblem,
    foundAt: row.found_at,
    note: row.note,
    status: row.status as LootStatus,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ------------------------------------------------------------------ *
 * Inventário local
 * ------------------------------------------------------------------ */

/** Itens visíveis do inventário (os marcados como apagados ficam de fora). */
export async function listItems(db: SQLiteDatabase): Promise<LootItem[]> {
  const rows = await db.getAllAsync<LootRow>(
    'SELECT * FROM loot_items WHERE deleted = 0 ORDER BY created_at DESC',
  );
  return rows.map(rowToItem);
}

export async function getItem(db: SQLiteDatabase, id: string): Promise<LootItem | null> {
  const row = await db.getFirstAsync<LootRow>(
    'SELECT * FROM loot_items WHERE id = ? AND deleted = 0',
    id,
  );
  return row ? rowToItem(row) : null;
}

export async function insertItem(db: SQLiteDatabase, item: LootItem): Promise<void> {
  await db.runAsync(
    `INSERT INTO loot_items
       (id, catalog_id, name, category, rarity, emblem, photo_uri, found_at, note,
        created_at, updated_at, status, returned_at, confidence, shared, sync_state,
        remote_id, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    item.id,
    item.catalogId,
    item.name,
    item.category,
    item.rarity,
    item.emblem,
    item.photoUri,
    item.foundAt,
    item.note,
    item.createdAt,
    item.updatedAt,
    item.status,
    item.returnedAt,
    item.confidence,
    item.shared ? 1 : 0,
    item.syncState,
    item.remoteId,
  );
}

/** Campos do domínio que podem ser alterados, e o nome de cada um no banco. */
const UPDATABLE: Record<string, string> = {
  name: 'name',
  foundAt: 'found_at',
  note: 'note',
  photoUri: 'photo_uri',
  status: 'status',
  returnedAt: 'returned_at',
  shared: 'shared',
  syncState: 'sync_state',
  remoteId: 'remote_id',
  updatedAt: 'updated_at',
};

/**
 * Atualiza apenas as colunas presentes em `patch`. Os nomes de coluna saem sempre
 * do mapa acima (nunca da chave crua recebida) e os valores viajam como parâmetros.
 */
export async function updateItem(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<LootItem>,
): Promise<void> {
  const assignments: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (!(key in patch)) continue;
    const value = patch[key as keyof LootItem];
    assignments.push(column + ' = ?');
    values.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value as string | number | null));
  }

  if (assignments.length === 0) return;

  values.push(id);
  await db.runAsync(
    'UPDATE loot_items SET ' + assignments.join(', ') + ' WHERE id = ?',
    ...values,
  );
}

/**
 * Exclusão em duas etapas: o item some do inventário na hora, mas a linha fica
 * como lápide até o servidor confirmar a remoção. Itens que nunca subiram podem
 * ser apagados de vez imediatamente.
 */
export async function deleteItem(db: SQLiteDatabase, id: string): Promise<void> {
  const row = await db.getFirstAsync<{ remote_id: string | null }>(
    'SELECT remote_id FROM loot_items WHERE id = ?',
    id,
  );

  if (!row) return;

  if (row.remote_id) {
    await db.runAsync(
      "UPDATE loot_items SET deleted = 1, sync_state = 'pending', updated_at = ? WHERE id = ?",
      Date.now(),
      id,
    );
  } else {
    await db.runAsync('DELETE FROM loot_items WHERE id = ?', id);
  }
}

/* ------------------------------------------------------------------ *
 * Fila de sincronização
 * ------------------------------------------------------------------ */

/** Itens publicados no mural que ainda não subiram (ou mudaram desde então). */
export async function pendingUploads(db: SQLiteDatabase): Promise<LootItem[]> {
  const rows = await db.getAllAsync<LootRow>(
    "SELECT * FROM loot_items WHERE deleted = 0 AND shared = 1 AND sync_state = 'pending' ORDER BY created_at",
  );
  return rows.map(rowToItem);
}

/** Lápides: já existiram no servidor e precisam ser removidas de lá. */
export async function pendingDeletions(db: SQLiteDatabase): Promise<LootItem[]> {
  const rows = await db.getAllAsync<LootRow>(
    "SELECT * FROM loot_items WHERE deleted = 1 AND sync_state = 'pending'",
  );
  return rows.map(rowToItem);
}

/**
 * Itens que saíram do mural (o usuário desmarcou "publicar") mas continuam no
 * servidor — precisam ser removidos de lá sem sumir do inventário.
 */
export async function pendingUnshares(db: SQLiteDatabase): Promise<LootItem[]> {
  const rows = await db.getAllAsync<LootRow>(
    'SELECT * FROM loot_items WHERE deleted = 0 AND shared = 0 AND remote_id IS NOT NULL',
  );
  return rows.map(rowToItem);
}

export async function markSynced(
  db: SQLiteDatabase,
  id: string,
  remoteId: string | null,
): Promise<void> {
  await db.runAsync(
    "UPDATE loot_items SET sync_state = 'synced', remote_id = ? WHERE id = ?",
    remoteId,
    id,
  );
}

/** Remove de vez a linha de uma lápide já apagada no servidor. */
export async function purgeItem(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM loot_items WHERE id = ?', id);
}

export async function countPending(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM loot_items
      WHERE (sync_state = 'pending' AND (shared = 1 OR deleted = 1))
         OR (deleted = 0 AND shared = 0 AND remote_id IS NOT NULL)`,
  );
  return row?.total ?? 0;
}

/* ------------------------------------------------------------------ *
 * Cache do mural coletivo
 * ------------------------------------------------------------------ */

/** Busca no mural por nome do item, local onde foi encontrado ou observação. */
export async function listMural(db: SQLiteDatabase, query = ''): Promise<MuralItem[]> {
  const term = query.trim();

  if (!term) {
    const all = await db.getAllAsync<MuralRow>(
      'SELECT * FROM mural_cache ORDER BY created_at DESC',
    );
    return all.map(rowToMural);
  }

  const like = '%' + term + '%';
  const rows = await db.getAllAsync<MuralRow>(
    `SELECT * FROM mural_cache
      WHERE name LIKE ? OR found_at LIKE ? OR note LIKE ? OR finder_name LIKE ?
      ORDER BY created_at DESC`,
    like,
    like,
    like,
    like,
  );
  return rows.map(rowToMural);
}

/**
 * Substitui o cache inteiro pelo que veio do servidor, numa transação — assim um
 * erro no meio do caminho não deixa o mural pela metade.
 */
export async function replaceMuralCache(db: SQLiteDatabase, items: MuralItem[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM mural_cache');

    for (const item of items) {
      await db.runAsync(
        `INSERT INTO mural_cache
           (remote_id, owner_id, finder_name, name, category, rarity, emblem,
            found_at, note, status, photo_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.remoteId,
        item.ownerId,
        item.finderName,
        item.name,
        item.category,
        item.rarity,
        item.emblem,
        item.foundAt,
        item.note,
        item.status,
        item.photoUrl,
        item.createdAt,
        item.updatedAt,
      );
    }
  });
}

export async function clearMuralCache(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM mural_cache');
}

/* ------------------------------------------------------------------ *
 * Metadados de controle
 * ------------------------------------------------------------------ */

export async function getMeta(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setMeta(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}
