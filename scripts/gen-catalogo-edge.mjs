/**
 * Gera o catálogo que a Edge Function usa no prompt, a partir do catálogo do app.
 *
 *   npm run gen:catalogo
 *
 * A função roda em Deno, fora do bundle do app, então não consegue importar
 * `src/domain/catalog.ts` diretamente. Em vez de manter duas listas na mão —
 * que fatalmente desandam —, este script extrai a lista de lá e escreve o
 * arquivo da função. Rode sempre que mexer no catálogo.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'src/domain/catalog.ts');
const destino = join(raiz, 'supabase/functions/identificar-loot/catalogo.ts');

const fonte = readFileSync(origem, 'utf8');

// Cada entrada é uma linha `{ id: '...', name: '...', category: '...', ... }`.
const entrada = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*category:\s*'([^']+)'/g;

const itens = [...fonte.matchAll(entrada)].map(([, id, name, category]) => ({
  id,
  name,
  category,
}));

if (itens.length < 10) {
  console.error(`Só ${itens.length} itens extraídos de ${origem} — o formato mudou?`);
  process.exitCode = 1;
} else {
  const linhas = itens
    .map((i) => `  { id: '${i.id}', name: ${JSON.stringify(i.name)}, category: '${i.category}' },`)
    .join('\n');

  writeFileSync(
    destino,
    `// GERADO POR scripts/gen-catalogo-edge.mjs — não edite na mão.
// Fonte da verdade: src/domain/catalog.ts  (rode: npm run gen:catalogo)

export interface ItemCatalogo {
  id: string;
  name: string;
  category: string;
}

export const CATALOGO: ItemCatalogo[] = [
${linhas}
];

/** Ids aceitos na resposta do modelo. Qualquer outro valor é descartado. */
export const IDS_VALIDOS = new Set(CATALOGO.map((i) => i.id));
`,
  );

  console.log(`${itens.length} itens escritos em supabase/functions/identificar-loot/catalogo.ts`);
}
