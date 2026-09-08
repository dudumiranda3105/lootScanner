export type RarityId = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

export type CategoryId =
  | 'material_escolar'
  | 'vestuario'
  | 'acessorio'
  | 'eletronico'
  | 'documento'
  | 'valioso';

/** Um "tipo de item" conhecido pelo app — a entrada da Pokédex. */
export interface CatalogEntry {
  id: string;
  name: string;
  category: CategoryId;
  emblem: string;
  /** Rótulos que um classificador de imagem costuma devolver para este item. */
  keywords: string[];
  /** Sobrepõe a raridade padrão da categoria (ex.: notebook é lendário). */
  rarityOverride?: RarityId;
}

export type LootStatus = 'guardado' | 'devolvido';

/** Situação do item em relação ao mural online. */
export type SyncState = 'pending' | 'synced';

/** Um item efetivamente escaneado e guardado no inventário. */
export interface LootItem {
  id: string;
  catalogId: string;
  name: string;
  category: CategoryId;
  rarity: RarityId;
  emblem: string;
  photoUri: string | null;
  /** Onde o objeto foi encontrado (sala 203, refeitório, ...). */
  foundAt: string;
  note: string;
  createdAt: number;
  status: LootStatus;
  returnedAt: number | null;
  /** Confiança da identificação automática, 0..1. */
  confidence: number;
  /** Última alteração local — usada para decidir o que ainda falta enviar. */
  updatedAt: number;
  /** O usuário autorizou publicar este item no mural coletivo. */
  shared: boolean;
  syncState: SyncState;
  /** Id da linha correspondente no Supabase, quando já sincronizada. */
  remoteId: string | null;
}

/** Um item publicado no mural coletivo por qualquer usuário. */
export interface MuralItem {
  remoteId: string;
  ownerId: string;
  /** Nome de caçador de quem achou o item. */
  finderName: string;
  name: string;
  category: CategoryId;
  rarity: RarityId;
  emblem: string;
  foundAt: string;
  note: string;
  status: LootStatus;
  photoUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Resultado bruto devolvido pelo serviço de identificação. */
export interface VisionGuess {
  catalogId: string;
  confidence: number;
}

export interface VisionResult {
  /** Palpites ordenados do mais provável para o menos provável. */
  guesses: VisionGuess[];
  /** Identificador do provedor que produziu o resultado (para depuração). */
  provider: string;
}
