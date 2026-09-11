// GERADO POR scripts/gen-catalogo-edge.mjs — não edite na mão.
// Fonte da verdade: src/domain/catalog.ts  (rode: npm run gen:catalogo)

export interface ItemCatalogo {
  id: string;
  name: string;
  category: string;
}

export const CATALOGO: ItemCatalogo[] = [
  { id: 'caderno', name: "Caderno", category: 'material_escolar' },
  { id: 'livro', name: "Livro", category: 'material_escolar' },
  { id: 'caneta', name: "Caneta", category: 'material_escolar' },
  { id: 'lapis', name: "Lápis", category: 'material_escolar' },
  { id: 'borracha', name: "Borracha", category: 'material_escolar' },
  { id: 'estojo', name: "Estojo", category: 'material_escolar' },
  { id: 'regua', name: "Régua", category: 'material_escolar' },
  { id: 'apostila', name: "Apostila", category: 'material_escolar' },
  { id: 'casaco', name: "Casaco", category: 'vestuario' },
  { id: 'blusa', name: "Blusa", category: 'vestuario' },
  { id: 'bone', name: "Boné", category: 'vestuario' },
  { id: 'cachecol', name: "Cachecol", category: 'vestuario' },
  { id: 'tenis', name: "Tênis", category: 'vestuario' },
  { id: 'garrafa', name: "Garrafa térmica", category: 'acessorio' },
  { id: 'guarda_chuva', name: "Guarda-chuva", category: 'acessorio' },
  { id: 'oculos', name: "Óculos", category: 'acessorio' },
  { id: 'mochila', name: "Mochila", category: 'acessorio' },
  { id: 'squeeze', name: "Copo / squeeze", category: 'acessorio' },
  { id: 'chaveiro', name: "Chaveiro", category: 'acessorio' },
  { id: 'fone', name: "Fone de ouvido", category: 'eletronico' },
  { id: 'carregador', name: "Carregador", category: 'eletronico' },
  { id: 'cabo', name: "Cabo USB", category: 'eletronico' },
  { id: 'pendrive', name: "Pen drive", category: 'eletronico' },
  { id: 'mouse', name: "Mouse", category: 'eletronico' },
  { id: 'calculadora', name: "Calculadora", category: 'eletronico' },
  { id: 'powerbank', name: "Power bank", category: 'eletronico' },
  { id: 'carteirinha', name: "Carteirinha estudantil", category: 'documento' },
  { id: 'documento', name: "Documento (RG/CNH)", category: 'documento' },
  { id: 'chave', name: "Molho de chaves", category: 'documento' },
  { id: 'cartao', name: "Cartão bancário", category: 'documento' },
  { id: 'celular', name: "Celular", category: 'valioso' },
  { id: 'notebook_pc', name: "Notebook", category: 'valioso' },
  { id: 'tablet', name: "Tablet", category: 'valioso' },
  { id: 'relogio', name: "Relógio", category: 'valioso' },
  { id: 'carteira', name: "Carteira", category: 'valioso' },
  { id: 'desconhecido', name: "Item misterioso", category: 'acessorio' },
];

/** Ids aceitos na resposta do modelo. Qualquer outro valor é descartado. */
export const IDS_VALIDOS = new Set(CATALOGO.map((i) => i.id));
