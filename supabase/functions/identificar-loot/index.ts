/**
 * Identifica um objeto achado a partir de uma foto.
 *
 * O app manda a imagem, esta função chama o OpenRouter e devolve qual item do
 * catálogo é, com que confiança, uma sugestão de raridade e uma frase de sabor.
 *
 * Por que uma Edge Function e não uma chamada direta do app: a chave do
 * OpenRouter fica aqui, como secret do projeto. Se ela estivesse no app, iria
 * junto no bundle e qualquer pessoa com o APK conseguiria extrair — e a conta
 * seria sua.
 *
 * Deploy:
 *   npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
 *   npx supabase functions deploy identificar-loot
 *
 * Por padrão o Supabase só aceita chamadas com um JWT válido, então apenas
 * usuários logados no app conseguem gastar a chave.
 */

import { CATALOGO, IDS_VALIDOS } from './catalogo.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Trocável por secret — qualquer modelo com visão do OpenRouter serve. */
const MODELO = Deno.env.get('OPENROUTER_MODEL') ?? 'anthropic/claude-sonnet-5';

const RARIDADES = ['comum', 'incomum', 'raro', 'epico', 'lendario'] as const;
type Raridade = (typeof RARIDADES)[number];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/* ------------------------------------------------------------------ *
 * Prompt
 * ------------------------------------------------------------------ */

const LISTA = CATALOGO.filter((i) => i.id !== 'desconhecido')
  .map((i) => `- ${i.id}: ${i.name} (${i.category})`)
  .join('\n');

const SISTEMA = `Você identifica objetos perdidos em fotos, para um aplicativo de achados e perdidos de uma escola.

Escolha o item do catálogo abaixo que MELHOR corresponde ao objeto principal da foto:

${LISTA}

Regras:
- Responda sempre com um id exatamente como escrito acima.
- Se nenhum item servir, ou a foto estiver ilegível, use "desconhecido".
- "confianca" é de 0 a 1 e deve refletir honestamente sua certeza. Não infle.
- "alternativas" traz até 2 outros ids plausíveis, do mais provável ao menos.
- "raridade" é o quanto o objeto parece valioso ou difícil de repor, na visão
  de um estudante: material escolar barato é "comum"; um celular ou notebook é
  "lendario". O aplicativo ainda ajusta esse valor, então dê sua leitura sincera.
- "sabor" é UMA frase curta em português, no tom bem-humorado de um jogo de RPG,
  descrevendo o objeto como se fosse um item de loot. Sem emoji. Máximo 100
  caracteres. Descreva o que você realmente vê na foto, não invente detalhes.`;

const ESQUEMA = {
  type: 'object',
  properties: {
    item: { type: 'string', description: 'id do item no catálogo' },
    confianca: { type: 'number' },
    alternativas: { type: 'array', items: { type: 'string' } },
    raridade: { type: 'string', enum: RARIDADES },
    sabor: { type: 'string' },
  },
  required: ['item', 'confianca', 'alternativas', 'raridade', 'sabor'],
  additionalProperties: false,
};

/* ------------------------------------------------------------------ *
 * Handler
 * ------------------------------------------------------------------ */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405);

  const chave = Deno.env.get('OPENROUTER_API_KEY');
  if (!chave) {
    return json({ erro: 'OPENROUTER_API_KEY não configurada no projeto.' }, 500);
  }

  let imagemBase64: string;
  let mimeType: string;

  try {
    const corpo = await req.json();
    imagemBase64 = String(corpo.imagemBase64 ?? '');
    mimeType = String(corpo.mimeType ?? 'image/jpeg');
  } catch {
    return json({ erro: 'Corpo inválido: esperado JSON.' }, 400);
  }

  if (!imagemBase64) return json({ erro: 'Faltou "imagemBase64".' }, 400);

  // ~4 MB de base64. Acima disso o modelo cobra caro e o upload arrasta.
  if (imagemBase64.length > 4_000_000) {
    return json({ erro: 'Imagem grande demais. Reduza a qualidade da foto.' }, 413);
  }

  try {
    const resposta = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json',
        'X-Title': 'LootScanner',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SISTEMA },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Que item de loot é este?' },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imagemBase64}` },
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'loot', strict: true, schema: ESQUEMA },
        },
        // Só roteia para provedores que realmente aceitam response_format,
        // em vez de cair num que ignora e devolve texto solto.
        provider: { require_parameters: true },
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      console.error('[openrouter]', resposta.status, detalhe.slice(0, 400));
      return json({ erro: `O serviço de visão respondeu ${resposta.status}.` }, 502);
    }

    const dados = await resposta.json();
    const conteudo = dados?.choices?.[0]?.message?.content;
    if (typeof conteudo !== 'string') {
      return json({ erro: 'Resposta do modelo veio vazia.' }, 502);
    }

    const bruto = JSON.parse(conteudo);

    /* ---- Nada do modelo entra sem validação ---- */

    const item = IDS_VALIDOS.has(bruto.item) ? bruto.item : 'desconhecido';

    const confianca = Math.max(0, Math.min(1, Number(bruto.confianca) || 0));

    const alternativas: string[] = Array.isArray(bruto.alternativas)
      ? bruto.alternativas.filter((a: unknown) => typeof a === 'string' && IDS_VALIDOS.has(a) && a !== item).slice(0, 2)
      : [];

    const raridade: Raridade | null = RARIDADES.includes(bruto.raridade)
      ? (bruto.raridade as Raridade)
      : null;

    const sabor = typeof bruto.sabor === 'string' ? bruto.sabor.slice(0, 120).trim() : '';

    return json({
      provider: `openrouter:${MODELO}`,
      guesses: [
        { catalogId: item, confidence: confianca },
        ...alternativas.map((id, i) => ({
          catalogId: id,
          confidence: Math.max(0.05, confianca - 0.2 - i * 0.15),
        })),
      ],
      rarityHint: raridade,
      flavor: sabor,
    });
  } catch (erro) {
    console.error('[identificar-loot]', erro);
    return json({ erro: 'Não foi possível identificar a imagem.' }, 502);
  }
});
