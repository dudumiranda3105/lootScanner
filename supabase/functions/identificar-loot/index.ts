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
 * A função exige um usuário logado de verdade — não basta um JWT válido, porque
 * a chave publishable do projeto também é um. Veja a checagem no handler.
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

const SISTEMA = `Você identifica objetos perdidos em fotos, para um aplicativo de achados e perdidos de uma escola brasileira.

A foto costuma ser de um único objeto largado sobre uma carteira, mesa, banco ou
chão, tirada de perto e às vezes com iluminação ruim. Ignore o fundo e o que
estiver ao redor: interessa o objeto em primeiro plano.

Escolha o item do catálogo abaixo que MELHOR corresponde a esse objeto:

${LISTA}

Regras:
- Responda sempre com um id exatamente como escrito acima.
- Prefira o item mais próximo a desistir. Uma lapiseira é "lapis"; um fichário é
  "pasta"; uma garrafinha de água é "garrafa"; um carregador de notebook é
  "carregador". Só use "desconhecido" quando nada na lista chegar perto.
- Quando usar "desconhecido", "descricao" é obrigatória.
- "descricao" é o nome real do objeto em 1 a 3 palavras, em português, como uma
  pessoa o chamaria ("cola bastão", "garrafa de café", "carregador de notebook").
  Preencha SEMPRE, mesmo quando reconhecer um item do catálogo: é o que permite
  registrar objetos que a lista não cobre.
- "confianca" é de 0 a 1 e deve refletir honestamente sua certeza. Não infle.
- "alternativas" traz até 2 outros ids plausíveis, do mais provável ao menos.
- "raridade" é o quanto o objeto parece valioso ou difícil de repor, na visão
  de um estudante: material escolar barato é "comum"; um celular ou notebook é
  "lendario". O aplicativo ainda ajusta esse valor, então dê sua leitura sincera.
- "sabor" é UMA frase curta em português, no tom bem-humorado de um jogo de RPG,
  descrevendo o objeto como se fosse um item de loot. Sem emoji. Máximo 100
  caracteres. Descreva o que você realmente vê na foto, não invente detalhes.

Responda APENAS com um objeto JSON, sem texto antes ou depois e sem cercas de
código, exatamente nesta forma:

{"item":"fone","confianca":0.82,"alternativas":["carregador"],"raridade":"raro","sabor":"...","descricao":"fone de ouvido"}`;

const ESQUEMA = {
  type: 'object',
  properties: {
    item: { type: 'string', description: 'id do item no catálogo' },
    confianca: { type: 'number' },
    alternativas: { type: 'array', items: { type: 'string' } },
    raridade: { type: 'string', enum: RARIDADES },
    sabor: { type: 'string' },
    descricao: { type: 'string' },
  },
  required: ['item', 'confianca', 'alternativas', 'raridade', 'sabor', 'descricao'],
  additionalProperties: false,
};

/**
 * Extrai o objeto JSON da resposta.
 *
 * Com `response_format` honrado, o conteúdo já vem JSON puro. Sem isso, modelos
 * costumam embrulhar em cercas de código ou emendar uma frase antes. Aqui a
 * cerca é removida e, se ainda sobrar texto, pegamos do primeiro `{` ao último
 * `}` — o suficiente para os dois casos.
 */
function extrairJson(texto: string): unknown {
  const limpo = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(limpo);
  } catch {
    const inicio = limpo.indexOf('{');
    const fim = limpo.lastIndexOf('}');
    if (inicio === -1 || fim <= inicio) throw new Error('A resposta do modelo não continha JSON.');
    return JSON.parse(limpo.slice(inicio, fim + 1));
  }
}

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

  /* ---- Exige um usuário logado de verdade ----
   *
   * A verificação de JWT do próprio Supabase NÃO basta aqui: a chave
   * publishable do projeto é um credencial válido para ela, e essa chave vai
   * dentro do app — qualquer um extrai do APK e chamaria esta função à vontade,
   * gastando o crédito do OpenRouter.
   *
   * Por isso perguntamos ao endpoint de autenticação quem é o portador do
   * token. Ele só responde 200 quando o Authorization carrega o JWT de uma
   * sessão real; com a chave publishable no lugar, devolve erro.
   */
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');

  if (!token) return json({ erro: 'Entre na sua conta para usar a identificação por IA.' }, 401);

  // Uma requisição só, sem SDK: importar o supabase-js inteiro aqui custa caro
  // no cold start e é muito mais do que precisamos para checar um usuário.
  const usuario = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);

  if (!usuario?.ok) {
    return json({ erro: 'Entre na sua conta para usar a identificação por IA.' }, 401);
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

  // O app reduz a foto para ~768px antes de enviar (~60-120 KB de base64).
  // Este teto existe para quem chamar a função por fora.
  if (imagemBase64.length > 1_500_000) {
    return json({ erro: 'Imagem grande demais — reduza antes de enviar.' }, 413);
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
        // Melhor esforço: os modelos que suportam devolvem JSON garantido. Os que
        // não suportam ignoram este campo — e aí vale a instrução do prompt, com
        // `extrairJson` limpando o que vier em volta. Não usamos
        // `provider.require_parameters`, que recusaria o roteamento para todo
        // modelo sem structured_outputs (a maioria dos gratuitos).
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'loot', strict: true, schema: ESQUEMA },
        },
      }),
      // Sem teto, uma chamada pendurada segura a função até o limite do runtime
      // — e o app fica girando junto, sem nunca receber resposta.
      signal: AbortSignal.timeout(25_000),
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

    const bruto = extrairJson(conteudo) as Record<string, unknown>;

    /* ---- Nada do modelo entra sem validação ---- */

    const item =
      typeof bruto.item === 'string' && IDS_VALIDOS.has(bruto.item) ? bruto.item : 'desconhecido';

    const confianca = Math.max(0, Math.min(1, Number(bruto.confianca) || 0));

    const alternativas = (Array.isArray(bruto.alternativas) ? bruto.alternativas : [])
      .filter((a): a is string => typeof a === 'string' && IDS_VALIDOS.has(a) && a !== item)
      .slice(0, 2);

    const raridade: Raridade | null = RARIDADES.includes(bruto.raridade as Raridade)
      ? (bruto.raridade as Raridade)
      : null;

    const sabor = typeof bruto.sabor === 'string' ? bruto.sabor.slice(0, 120).trim() : '';

    const descricao =
      typeof bruto.descricao === 'string' ? bruto.descricao.slice(0, 60).trim() : '';

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
      descricao,
    });
  } catch (erro) {
    console.error('[identificar-loot]', erro);
    return json({ erro: 'Não foi possível identificar a imagem.' }, 502);
  }
});
