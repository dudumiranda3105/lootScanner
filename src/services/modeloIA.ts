import type { SQLiteDatabase } from 'expo-sqlite';

import * as repo from '../db/lootRepo';
import { acharModelo, ModeloIA, MODELO_PADRAO } from '../domain/modelosIA';

const CHAVE = 'modelo_ia';

/**
 * A escolha vive na tabela `sync_meta` do SQLite e também aqui, em memória.
 *
 * A cópia em memória existe porque `identifyItem` é uma função de serviço, sem
 * acesso à conexão do banco — e ler o disco a cada escaneamento para buscar uma
 * string não se paga. O provedor da tela carrega uma vez no início.
 */
let emMemoria: ModeloIA = MODELO_PADRAO;

/** Modelo em uso agora. */
export function modeloAtual(): ModeloIA {
  return emMemoria;
}

/** Lê a escolha salva. Chamado uma vez, na abertura do app. */
export async function carregarModelo(db: SQLiteDatabase): Promise<ModeloIA> {
  try {
    emMemoria = acharModelo(await repo.getMeta(db, CHAVE));
  } catch (error) {
    console.warn('[modeloIA] não foi possível ler a escolha salva:', error);
    emMemoria = MODELO_PADRAO;
  }
  return emMemoria;
}

/** Salva a escolha e passa a valer no próximo escaneamento. */
export async function definirModelo(db: SQLiteDatabase, id: string): Promise<ModeloIA> {
  // `acharModelo` cai no padrão se o id não existir, então nunca guardamos lixo.
  const escolhido = acharModelo(id);
  await repo.setMeta(db, CHAVE, escolhido.id);
  emMemoria = escolhido;
  return escolhido;
}
