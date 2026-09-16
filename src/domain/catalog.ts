import { CatalogEntry, CategoryId } from './types';
import { rarityOf } from './rarity';

/**
 * Catálogo de itens conhecidos — é a "Pokédex" do app.
 * `keywords` são os rótulos que um classificador de imagem tende a devolver;
 * o serviço de visão usa essa lista para mapear rótulo -> item do catálogo.
 */
export const CATALOG: CatalogEntry[] = [
  // --- Material escolar (comum) ---
  { id: 'caderno', name: 'Caderno', category: 'material_escolar', emblem: '📓', icon: 'notebook', keywords: ['notebook', 'caderno', 'binder', 'diary'] },
  { id: 'livro', name: 'Livro', category: 'material_escolar', emblem: '📕', icon: 'book-open-page-variant', keywords: ['book', 'livro', 'textbook'] },
  { id: 'caneta', name: 'Caneta', category: 'material_escolar', emblem: '🖊️', icon: 'pen', keywords: ['pen', 'caneta', 'ballpoint'] },
  { id: 'lapis', name: 'Lápis', category: 'material_escolar', emblem: '✏️', icon: 'pencil', keywords: ['pencil', 'lapis'] },
  { id: 'borracha', name: 'Borracha', category: 'material_escolar', emblem: '🧽', icon: 'eraser', keywords: ['eraser', 'rubber', 'borracha'] },
  { id: 'estojo', name: 'Estojo', category: 'material_escolar', emblem: '🧰', icon: 'pencil-box-multiple', keywords: ['pencil case', 'estojo', 'pouch'] },
  { id: 'regua', name: 'Régua', category: 'material_escolar', emblem: '📏', icon: 'ruler', keywords: ['ruler', 'regua'] },
  { id: 'apostila', name: 'Apostila', category: 'material_escolar', emblem: '📄', icon: 'file-document-outline', keywords: ['paper', 'document', 'apostila'] },
  { id: 'cola', name: 'Cola', category: 'material_escolar', emblem: '🧴', icon: 'bottle-tonic', keywords: ['glue', 'glue stick', 'cola', 'adhesive', 'bastao de cola'] },
  { id: 'tesoura', name: 'Tesoura', category: 'material_escolar', emblem: '✂️', icon: 'content-cut', keywords: ['scissors', 'tesoura', 'shears'] },
  { id: 'apontador', name: 'Apontador', category: 'material_escolar', emblem: '🔪', icon: 'pencil-box-outline', keywords: ['pencil sharpener', 'sharpener', 'apontador'] },
  { id: 'marca_texto', name: 'Marca-texto', category: 'material_escolar', emblem: '🖍️', icon: 'marker', keywords: ['highlighter', 'marker', 'marca-texto', 'marcador'] },
  { id: 'corretivo', name: 'Corretivo', category: 'material_escolar', emblem: '⚪', icon: 'format-color-fill', keywords: ['correction fluid', 'white out', 'corretivo', 'liquid paper'] },
  { id: 'agenda', name: 'Agenda', category: 'material_escolar', emblem: '📔', icon: 'calendar-text', keywords: ['planner', 'agenda', 'diary', 'calendar'] },
  { id: 'pasta', name: 'Pasta / fichário', category: 'material_escolar', emblem: '📁', icon: 'folder-outline', keywords: ['folder', 'binder', 'pasta', 'ficharo', 'file folder'] },
  { id: 'grampeador', name: 'Grampeador', category: 'material_escolar', emblem: '📎', icon: 'paperclip', keywords: ['stapler', 'grampeador', 'paper clip', 'clipe'] },

  // --- Vestuário (incomum) ---
  { id: 'casaco', name: 'Casaco', category: 'vestuario', emblem: '🧥', icon: 'coat-rack', keywords: ['jacket', 'coat', 'casaco', 'hoodie', 'sweater'] },
  { id: 'blusa', name: 'Blusa', category: 'vestuario', emblem: '👕', icon: 'tshirt-crew', keywords: ['shirt', 't-shirt', 'blusa', 'jersey'] },
  { id: 'bone', name: 'Boné', category: 'vestuario', emblem: '🧢', icon: 'hat-fedora', keywords: ['cap', 'hat', 'bone'] },
  { id: 'cachecol', name: 'Cachecol', category: 'vestuario', emblem: '🧣', icon: 'tie', keywords: ['scarf', 'cachecol'] },
  { id: 'tenis', name: 'Tênis', category: 'vestuario', emblem: '👟', icon: 'shoe-sneaker', keywords: ['sneaker', 'shoe', 'tenis', 'running shoe'] },
  { id: 'chinelo', name: 'Chinelo', category: 'vestuario', emblem: '🩴', icon: 'shoe-cleat', keywords: ['sandal', 'flip flop', 'chinelo', 'slipper'] },
  { id: 'luva', name: 'Luva', category: 'vestuario', emblem: '🧤', icon: 'hand-back-left-outline', keywords: ['glove', 'gloves', 'luva', 'mitten'] },

  // --- Acessórios (incomum) ---
  { id: 'garrafa', name: 'Garrafa térmica', category: 'acessorio', emblem: '🍶', icon: 'bottle-soda-classic', keywords: ['bottle', 'water bottle', 'garrafa', 'thermos'] },
  { id: 'guarda_chuva', name: 'Guarda-chuva', category: 'acessorio', emblem: '☂️', icon: 'umbrella', keywords: ['umbrella', 'guarda-chuva'] },
  { id: 'oculos', name: 'Óculos', category: 'acessorio', emblem: '👓', icon: 'glasses', keywords: ['glasses', 'sunglasses', 'oculos', 'eyewear'] },
  { id: 'mochila', name: 'Mochila', category: 'acessorio', emblem: '🎒', icon: 'bag-personal', keywords: ['backpack', 'mochila', 'bag'] },
  { id: 'squeeze', name: 'Copo / squeeze', category: 'acessorio', emblem: '🥤', icon: 'cup', keywords: ['cup', 'mug', 'tumbler', 'copo'] },
  { id: 'chaveiro', name: 'Chaveiro', category: 'acessorio', emblem: '🧸', icon: 'teddy-bear', keywords: ['keychain', 'chaveiro', 'toy'] },
  { id: 'lancheira', name: 'Lancheira', category: 'acessorio', emblem: '🍱', icon: 'food-apple-outline', keywords: ['lunch box', 'lunchbox', 'lancheira', 'marmita'] },
  { id: 'talheres', name: 'Talheres', category: 'acessorio', emblem: '🍴', icon: 'silverware-fork-knife', keywords: ['cutlery', 'fork', 'spoon', 'talher', 'garfo', 'colher'] },
  { id: 'toalha', name: 'Toalha', category: 'acessorio', emblem: '🧻', icon: 'hanger', keywords: ['towel', 'toalha'] },
  { id: 'mascara', name: 'Máscara', category: 'acessorio', emblem: '😷', icon: 'face-mask-outline', keywords: ['face mask', 'mask', 'mascara'] },

  // --- Eletrônicos (raro) ---
  { id: 'fone', name: 'Fone de ouvido', category: 'eletronico', emblem: '🎧', icon: 'headphones', keywords: ['headphone', 'earphone', 'fone', 'earbuds'] },
  { id: 'carregador', name: 'Carregador', category: 'eletronico', emblem: '🔌', icon: 'power-plug', keywords: ['charger', 'adapter', 'carregador', 'plug'] },
  { id: 'cabo', name: 'Cabo USB', category: 'eletronico', emblem: '🧵', icon: 'usb', keywords: ['cable', 'usb', 'cabo', 'cord'] },
  { id: 'pendrive', name: 'Pen drive', category: 'eletronico', emblem: '💾', icon: 'usb-flash-drive', keywords: ['flash drive', 'usb stick', 'pendrive'] },
  { id: 'mouse', name: 'Mouse', category: 'eletronico', emblem: '🖱️', icon: 'mouse', keywords: ['mouse', 'computer mouse'] },
  { id: 'calculadora', name: 'Calculadora', category: 'eletronico', emblem: '🧮', icon: 'calculator', keywords: ['calculator', 'calculadora'] },
  { id: 'powerbank', name: 'Power bank', category: 'eletronico', emblem: '🔋', icon: 'battery-charging', keywords: ['power bank', 'battery', 'bateria'] },
  { id: 'teclado', name: 'Teclado', category: 'eletronico', emblem: '⌨️', icon: 'keyboard-outline', keywords: ['keyboard', 'teclado'] },
  { id: 'caixa_som', name: 'Caixa de som', category: 'eletronico', emblem: '🔊', icon: 'speaker', keywords: ['speaker', 'bluetooth speaker', 'caixa de som'] },
  { id: 'controle', name: 'Controle', category: 'eletronico', emblem: '🎮', icon: 'gamepad-variant', keywords: ['controller', 'gamepad', 'joystick', 'controle'] },

  // --- Documentos e chaves (épico) ---
  { id: 'carteirinha', name: 'Carteirinha estudantil', category: 'documento', emblem: '🪪', icon: 'card-account-details', keywords: ['id card', 'badge', 'carteirinha', 'student card'] },
  { id: 'documento', name: 'Documento (RG/CNH)', category: 'documento', emblem: '📇', icon: 'card-account-details-outline', keywords: ['identity card', 'license', 'rg', 'cnh'] },
  { id: 'chave', name: 'Molho de chaves', category: 'documento', emblem: '🗝️', icon: 'key-variant', keywords: ['key', 'keys', 'chave'] },
  { id: 'cartao', name: 'Cartão bancário', category: 'documento', emblem: '💳', icon: 'credit-card', keywords: ['credit card', 'debit card', 'cartao'] },

  // --- Itens de valor (lendário) ---
  { id: 'celular', name: 'Celular', category: 'valioso', emblem: '📱', icon: 'cellphone', keywords: ['cellphone', 'smartphone', 'celular', 'phone', 'iphone'] },
  { id: 'notebook_pc', name: 'Notebook', category: 'valioso', emblem: '💻', icon: 'laptop', keywords: ['laptop', 'notebook computer', 'macbook'] },
  { id: 'tablet', name: 'Tablet', category: 'valioso', emblem: '📲', icon: 'tablet', keywords: ['tablet', 'ipad'] },
  { id: 'relogio', name: 'Relógio', category: 'valioso', emblem: '⌚', icon: 'watch', keywords: ['watch', 'smartwatch', 'relogio'] },
  { id: 'carteira', name: 'Carteira', category: 'valioso', emblem: '👛', icon: 'wallet', keywords: ['wallet', 'purse', 'carteira'] },

  // --- Coringa: usado quando nada é reconhecido ---
  { id: 'desconhecido', name: 'Item misterioso', category: 'acessorio', emblem: '❓', icon: 'help-circle-outline', keywords: [], rarityOverride: 'comum' },
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
