import { CATALOG, COLLECTIBLES, catalogRarity, getCatalogEntry } from '../domain/catalog';
import { RarityId, VisionResult } from '../domain/types';
import { modeloAtual } from './modeloIA';
import { isSupabaseConfigured, requireSupabase } from './supabase';

export interface VisionInput {
  uri: string;
  /** Imagem em base64, quando disponível — usada pelos provedores reais. */
  base64?: string | null;
  width?: number;
  height?: number;
}

export interface VisionProvider {
  id: string;
  identify(input: VisionInput): Promise<VisionResult>;
}

/* ------------------------------------------------------------------ *
 * Rótulo -> item do catálogo
 * ------------------------------------------------------------------ */

const LABEL_INDEX: { keyword: string; catalogId: string }[] = CATALOG.flatMap((entry) =>
  entry.keywords.map((keyword) => ({ keyword: keyword.toLowerCase(), catalogId: entry.id })),
);

/**
 * Converte os rótulos de um classificador de imagem (ex.: "water bottle", "laptop")
 * em ids do catálogo. Qualquer provedor real deve terminar passando por aqui.
 */
export function labelsToGuesses(
  labels: { label: string; confidence: number }[],
): VisionResult['guesses'] {
  const scores = new Map<string, number>();

  for (const { label, confidence } of labels) {
    const normalized = label.toLowerCase();
    for (const { keyword, catalogId } of LABEL_INDEX) {
      if (normalized.includes(keyword) || keyword.includes(normalized)) {
        scores.set(catalogId, Math.max(scores.get(catalogId) ?? 0, confidence));
      }
    }
  }

  const guesses = [...scores.entries()]
    .map(([catalogId, confidence]) => ({ catalogId, confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return guesses.length > 0 ? guesses : [{ catalogId: 'desconhecido', confidence: 0 }];
}

/* ------------------------------------------------------------------ *
 * Provedor simulado (padrão)
 * ------------------------------------------------------------------ */

/** FNV-1a de 32 bits: gera um número estável a partir do conteúdo da foto. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Gerador pseudoaleatório determinístico a partir de uma semente. */
function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

/** Distribuição de raridade do sorteio — itens comuns aparecem muito mais. */
const RARITY_WEIGHTS: { rarity: RarityId; weight: number }[] = [
  { rarity: 'comum', weight: 44 },
  { rarity: 'incomum', weight: 26 },
  { rarity: 'raro', weight: 18 },
  { rarity: 'epico', weight: 8 },
  { rarity: 'lendario', weight: 4 },
];

function pickRarity(random: () => number): RarityId {
  const total = RARITY_WEIGHTS.reduce((sum, r) => sum + r.weight, 0);
  let roll = random() * total;
  for (const { rarity, weight } of RARITY_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'comum';
}

/**
 * Provedor usado por padrão: não faz reconhecimento de verdade, mas deriva o
 * resultado do conteúdo da própria foto — a mesma imagem sempre devolve o mesmo
 * item, e imagens diferentes devolvem itens diferentes. Serve para desenvolver e
 * demonstrar o fluxo completo sem depender de chave de API ou de internet.
 * Troque por um provedor real implementando `VisionProvider`.
 */
export const mockVisionProvider: VisionProvider = {
  id: 'mock',

  async identify(input) {
    // Amostra o base64 (quando existe) para que fotos diferentes gerem semente diferente
    // sem percorrer megabytes de string.
    const sample = input.base64
      ? sampleString(input.base64, 512)
      : `${input.uri}:${input.width ?? 0}x${input.height ?? 0}`;

    const random = seededRandom(hash32(sample));

    // Latência simulada: dá tempo da animação de "analisando" aparecer.
    await delay(700 + Math.floor(random() * 500));

    const rarity = pickRarity(random);
    const pool = COLLECTIBLES.filter((entry) => catalogRarity(entry.id) === rarity);
    const primary = pool[Math.floor(random() * pool.length)] ?? COLLECTIBLES[0];

    // Alternativas: outros itens da mesma categoria, para o usuário corrigir em 1 toque.
    const alternatives = COLLECTIBLES.filter(
      (entry) => entry.category === primary.category && entry.id !== primary.id,
    )
      .sort(() => random() - 0.5)
      .slice(0, 2);

    const topConfidence = 0.68 + random() * 0.29;

    return {
      provider: 'mock',
      guesses: [
        { catalogId: primary.id, confidence: topConfidence },
        ...alternatives.map((entry, index) => ({
          catalogId: entry.id,
          confidence: Math.max(0.05, topConfidence - 0.2 - index * 0.15),
        })),
      ],
    };
  },
};

function sampleString(value: string, samples: number): string {
  if (value.length <= samples) return value;
  const step = Math.floor(value.length / samples);
  let out = '';
  for (let i = 0; i < value.length; i += step) out += value[i];
  return out;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ *
 * Provedor remoto (opcional)
 * ------------------------------------------------------------------ */

/**
 * Ponto de troca para um serviço de visão real. O endpoint deve receber
 * `{ imageBase64 }` e responder `{ labels: [{ label, confidence }] }`.
 * A chave de API deve ficar no servidor, nunca dentro do app.
 */
export function createRemoteVisionProvider(endpoint: string): VisionProvider {
  return {
    id: 'remote',
    async identify(input) {
      if (!input.base64) throw new Error('Provedor remoto exige a foto em base64.');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: input.base64 }),
      });

      if (!response.ok) throw new Error(`Serviço de visão respondeu ${response.status}.`);

      const payload = (await response.json()) as { labels?: { label: string; confidence: number }[] };
      return { provider: 'remote', guesses: labelsToGuesses(payload.labels ?? []) };
    },
  };
}

/* ------------------------------------------------------------------ *
 * Seleção do provedor ativo
 * ------------------------------------------------------------------ */

/**
 * Provedor de verdade: manda a foto para a Edge Function `identificar-loot`,
 * que chama o OpenRouter. A chave da IA vive lá, como secret do projeto — nunca
 * dentro do app.
 *
 * O `functions.invoke` anexa sozinho o JWT da sessão. Sem login ele manda só a
 * chave publishable, e a função responde 401 — de propósito: ela confere que
 * existe um usuário de verdade, não apenas um JWT qualquer. Nesse caso o
 * `identifyItem` cai no provedor simulado.
 */
export const supabaseVisionProvider: VisionProvider = {
  id: 'supabase',

  async identify(input) {
    if (!input.base64) throw new Error('A identificação por IA precisa da foto em base64.');
    const client = requireSupabase();

    const { data, error } = await client.functions.invoke('identificar-loot', {
      body: {
        imagemBase64: input.base64,
        mimeType: 'image/jpeg',
        // A função só aceita ids da lista permitida; qualquer outro cai no padrão.
        modelo: modeloAtual().id,
      },
    });

    if (error) throw await detalharErro(error);
    if (data?.erro) throw new Error(String(data.erro));

    const guesses = Array.isArray(data?.guesses) ? data.guesses : [];
    if (guesses.length === 0) throw new Error('A IA não devolveu nenhum palpite.');

    return {
      provider: String(data.provider ?? 'supabase'),
      guesses,
      rarityHint: (data.rarityHint ?? null) as RarityId | null,
      flavor: typeof data.flavor === 'string' ? data.flavor : undefined,
      descricao: typeof data.descricao === 'string' ? data.descricao : undefined,
    };
  },
};

/* ------------------------------------------------------------------ *
 * Seleção do provedor ativo
 * ------------------------------------------------------------------ */

/**
 * Abre o erro do `functions.invoke`.
 *
 * Um `FunctionsHttpError` traz só "Edge Function returned a non-2xx status
 * code" na mensagem — o motivo de verdade fica no corpo da resposta, guardado
 * em `context`. Sem desempacotar isso, todo problema da função (sem login,
 * crédito zerado, chave errada) vira o mesmo texto genérico no console.
 */
async function detalharErro(error: unknown): Promise<Error> {
  const contexto = (error as { context?: Response })?.context;

  if (contexto && typeof contexto.json === 'function') {
    const corpo = await contexto.json().catch(() => null);
    const detalhe = corpo?.erro ?? (corpo ? JSON.stringify(corpo) : 'sem corpo');
    return new Error(`a função respondeu ${contexto.status} — ${detalhe}`);
  }

  return error instanceof Error ? error : new Error(String(error));
}

/** Teto para a identificação por IA. Acima disso, o simulado assume. */
const TEMPO_LIMITE_MS = 30_000;

/** Rejeita se a promessa não resolver a tempo. O trabalho em si segue solto. */
function comPrazo<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Tempo esgotado (${ms / 1000}s).`)), ms),
    ),
  ]);
}

const REMOTE_ENDPOINT = process.env.EXPO_PUBLIC_VISION_ENDPOINT;

/** `true` quando o app deve tentar a IA de verdade antes de cair no simulado. */
export const visionUsaIA = Boolean(REMOTE_ENDPOINT) || isSupabaseConfigured;

export const visionProvider: VisionProvider = REMOTE_ENDPOINT
  ? createRemoteVisionProvider(REMOTE_ENDPOINT)
  : isSupabaseConfigured
    ? supabaseVisionProvider
    : mockVisionProvider;

/**
 * Executa a identificação e nunca rejeita.
 *
 * Se a IA falhar — sem internet, sem login, chave não configurada, função fora
 * do ar — cai no provedor simulado em vez de devolver "item misterioso". O
 * fluxo do app continua inteiro e a demonstração nunca trava por causa da rede.
 */
export async function identifyItem(input: VisionInput): Promise<VisionResult> {
  try {
    // O teto é obrigatório: `functions.invoke` não tem timeout próprio, e uma
    // chamada que nunca volta deixaria a tela de "analisando" girando para
    // sempre — sem erro no console e sem saída para o usuário.
    const result = await comPrazo(visionProvider.identify(input), TEMPO_LIMITE_MS);
    if (result.guesses.length > 0) return result;
  } catch (error) {
    console.warn('[vision] a identificação por IA falhou, usando o simulado:', error);
  }

  if (visionProvider.id !== mockVisionProvider.id) {
    try {
      return await mockVisionProvider.identify(input);
    } catch (error) {
      console.warn('[vision] o provedor simulado também falhou:', error);
    }
  }

  return { provider: visionProvider.id, guesses: [{ catalogId: 'desconhecido', confidence: 0 }] };
}

/** Conveniência para as telas: o palpite principal já resolvido no catálogo. */
export function topEntry(result: VisionResult) {
  return getCatalogEntry(result.guesses[0].catalogId);
}
