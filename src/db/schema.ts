import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Versão do esquema local. Ao mudar as tabelas, incremente e acrescente um
 * bloco `if (version === N)` em `migrate` — nunca edite um bloco já publicado,
 * senão os aparelhos que já rodaram a versão anterior ficam inconsistentes.
 */
export const DATABASE_VERSION = 2;

export const DATABASE_NAME = 'lootscanner.db';

/**
 * Executado uma única vez por conexão, no `onInit` do <SQLiteProvider>.
 * Usa `PRAGMA user_version` para saber em que ponto o banco deste aparelho está.
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      -- Inventário do próprio usuário: é a fonte da verdade do app.
      CREATE TABLE loot_items (
        id           TEXT    PRIMARY KEY NOT NULL,
        catalog_id   TEXT    NOT NULL,
        name         TEXT    NOT NULL,
        category     TEXT    NOT NULL,
        rarity       TEXT    NOT NULL,
        emblem       TEXT    NOT NULL,
        photo_uri    TEXT,
        found_at     TEXT    NOT NULL DEFAULT '',
        note         TEXT    NOT NULL DEFAULT '',
        created_at   INTEGER NOT NULL,
        updated_at   INTEGER NOT NULL,
        status       TEXT    NOT NULL DEFAULT 'guardado',
        returned_at  INTEGER,
        confidence   REAL    NOT NULL DEFAULT 0,
        shared       INTEGER NOT NULL DEFAULT 0,
        sync_state   TEXT    NOT NULL DEFAULT 'pending',
        remote_id    TEXT,
        deleted      INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX idx_loot_created ON loot_items (created_at DESC);
      CREATE INDEX idx_loot_status  ON loot_items (status);
      CREATE INDEX idx_loot_sync    ON loot_items (sync_state);

      -- Cópia local do mural coletivo, para que ele também abra sem internet.
      CREATE TABLE mural_cache (
        remote_id   TEXT    PRIMARY KEY NOT NULL,
        owner_id    TEXT    NOT NULL,
        finder_name TEXT    NOT NULL DEFAULT '',
        catalog_id  TEXT    NOT NULL DEFAULT 'desconhecido',
        name        TEXT    NOT NULL,
        category    TEXT    NOT NULL,
        rarity      TEXT    NOT NULL,
        emblem      TEXT    NOT NULL,
        found_at    TEXT    NOT NULL DEFAULT '',
        note        TEXT    NOT NULL DEFAULT '',
        status      TEXT    NOT NULL DEFAULT 'guardado',
        photo_url   TEXT,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE INDEX idx_mural_updated ON mural_cache (updated_at DESC);

      -- Pares chave/valor de controle (data do último sync, etc.).
      CREATE TABLE sync_meta (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    version = 1;
  }

  if (version === 1) {
    // O mural passou a mostrar o icone vetorial do item, que e derivado do
    // catalogo — por isso o cache precisa guardar de qual item se trata.
    await db.execAsync(
      "ALTER TABLE mural_cache ADD COLUMN catalog_id TEXT NOT NULL DEFAULT 'desconhecido';",
    );
    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}
