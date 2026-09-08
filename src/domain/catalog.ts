import { CatalogEntry, CategoryId } from './types';
import { rarityOf } from './rarity';

/**
 * Catálogo de itens conhecidos — é a "Pokédex" do app.
 * `keywords` são os rótulos que um classificador de imagem tende a devolver;
 * o serviço de visão usa essa lista para mapear rótulo -> item do catálogo.
 */
export const CATALOG: CatalogEntry[] = [
  // --- Material escolar (comum) ---
  { id: 'caderno', name: 'Caderno', category: 'material_escolar', emblem: '📓', keywords: ['notebook', 'caderno', 'binder', 'diary'] },
  { id: 'livro', name: 'Livro', category: 'material_escolar', emblem: '📕', keywords: ['book', 'livro', 'textbook'] },
  { id: 'caneta', name: 'Caneta', category: 'material_escolar', emblem: '🖊️', keywords: ['pen', 'caneta', 'ballpoint'] },
  { id: 'lapis', name: 'Lápis', category: 'material_escolar', emblem: '✏️', keywords: ['pencil', 'lapis'] },
  { id: 'borracha', name: 'Borracha', category: 'material_escolar', emblem: '🧽', keywords: ['eraser', 'rubber', 'borracha'] },
  { id: 'estojo', name: 'Estojo', category: 'material_escolar', emblem: '🧰', keywords: ['pencil case', 'estojo', 'pouch'] },
  { id: 'regua', name: 'Régua', category: 'material_escolar', emblem: '📏', keywords: ['ruler', 'regua'] },
  { id: 'apostila', name: 'Apostila', category: 'material_escolar', emblem: '📄', keywords: ['paper', 'document', 'apostila', 'folder'] },

  // --- Vestuário (incomum) ---
  { id: 'casaco', name: 'Casaco', category: 'vestuario', emblem: '🧥', keywords: ['jacket', 'coat', 'casaco', 'hoodie', 'sweater'] },
  { id: 'blusa', name: 'Blusa', category: 'vestuario', emblem: '👕', keywords: ['shirt', 't-shirt', 'blusa', 'jersey'] },
  { id: 'bone', name: 'Boné', category: 'vestuario', emblem: '🧢', keywords: ['cap', 'hat', 'bone'] },
  { id: 'cachecol', name: 'Cachecol', category: 'vestuario', emblem: '🧣', keywords: ['scarf', 'cachecol'] },
  { id: 'tenis', name: 'Tênis', category: 'vestuario', emblem: '👟', keywords: ['sneaker', 'shoe', 'tenis', 'running shoe'] },

  // --- Acessórios (incomum) ---
  { id: 'garrafa', name: 'Garrafa térmica', category: 'acessorio', emblem: '🍶', keywords: ['bottle', 'water bottle', 'garrafa', 'thermos'] },
  { id: 'guarda_chuva', name: 'Guarda-chuva', category: 'acessorio', emblem: '☂️', keywords: ['umbrella', 'guarda-chuva'] },
  { id: 'oculos', name: 'Óculos', category: 'acessorio', emblem: '👓', keywords: ['glasses', 'sunglasses', 'oculos', 'eyewear'] },
  { id: 'mochila', name: 'Mochila', category: 'acessorio', emblem: '🎒', keywords: ['backpack', 'mochila', 'bag'] },
  { id: 'squeeze', name: 'Copo / squeeze', category: 'acessorio', emblem: '🥤', keywords: ['cup', 'mug', 'tumbler', 'copo'] },
  { id: 'chaveiro', name: 'Chaveiro', category: 'acessorio', emblem: '🧸', keywords: ['keychain', 'chaveiro', 'toy'] },

  // --- Eletrônicos (raro) ---
  { id: 'fone', name: 'Fone de ouvido', category: 'eletronico', emblem: '🎧', keywords: ['headphone', 'earphone', 'fone', 'earbuds'] },
  { id: 'carregador', name: 'Carregador', category: 'eletronico', emblem: '🔌', keywords: ['charger', 'adapter', 'carregador', 'plug'] },
  { id: 'cabo', name: 'Cabo USB', category: 'eletronico', emblem: '🧵', keywords: ['cable', 'usb', 'cabo', 'cord'] },
  { id: 'pendrive', name: 'Pen drive', category: 'eletronico', emblem: '💾', keywords: ['flash drive', 'usb stick', 'pendrive'] },
  { id: 'mouse', name: 'Mouse', category: 'eletronico', emblem: '🖱️', keywords: ['mouse', 'computer mouse'] },
  { id: 'calculadora', name: 'Calculadora', category: 'eletronico', emblem: '🧮', keywords: ['calculator', 'calculadora'] },
  { id: 'powerbank', name: 'Power bank', category: 'eletronico', emblem: '🔋', keywords: ['power bank', 'battery', 'bateria'] },

  // --- Documentos e chaves (épico) ---
  { id: 'carteirinha', name: 'Carteirinha estudantil', category: 'documento', emblem: '🪪', keywords: ['id card', 'badge', 'carteirinha', 'student card'] },
  { id: 'documento', name: 'Documento (RG/CNH)', category: 'documento', emblem: '📇', keywords: ['identity card', 'license', 'rg', 'cnh'] },
  { id: 'chave', name: 'Molho de chaves', category: 'documento', emblem: '🗝️', keywords: ['key', 'keys', 'chave'] },
  { id: 'cartao', name: 'Cartão bancário', category: 'documento', emblem: '💳', keywords: ['credit card', 'debit card', 'cartao'] },

  // --- Itens de valor (lendário) ---
  { id: 'celular', name: 'Celular', category: 'valioso', emblem: '📱', keywords: ['cellphone', 'smartphone', 'celular', 'phone', 'iphone'] },
  { id: 'notebook_pc', name: 'Notebook', category: 'valioso', emblem: '💻', keywords: ['laptop', 'notebook computer', 'macbook'] },
  { id: 'tablet', name: 'Tablet', category: 'valioso', emblem: '📲', keywords: ['tablet', 'ipad'] },
  { id: 'relogio', name: 'Relógio', category: 'valioso', emblem: '⌚', keywords: ['watch', 'smartwatch', 'relogio'] },
  { id: 'carteira', name: 'Carteira', category: 'valioso', emblem: '👛', keywords: ['wallet', 'purse', 'carteira'] },

  // --- Coringa: usado quando nada é reconhecido ---
  { id: 'desconhecido', name: 'Item misterioso', category: 'acessorio', emblem: '❓', keywords: [], rarityOverride: 'comum' },
];

const BY_ID = new Map(CATALOG.map((entry) => [entry.id, entry]));

const FALLBACK = CATALOG[CATALOG.length - 1];

export function getCatalogEntry(id: string): CatalogEntry {
  return BY_ID.get(id) ?? FALLBACK;
}

export function catalogRarity(id: string) {
  const entry = getCatalogEntry(id);
  return rarityOf(entry.category, entry.rarityOverride);
}

export function catalogByCategory(category: CategoryId): CatalogEntry[] {
  return CATALOG.filter((entry) => entry.category === category && entry.id !== 'desconhecido');
}

/** Tipos colecionáveis (o "desconhecido" não conta para a coleção). */
export const COLLECTIBLES = CATALOG.filter((entry) => entry.id !== 'desconhecido');

export const CATALOG_SIZE = COLLECTIBLES.length;
