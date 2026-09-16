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
import { MODELO_PADRAO, MODELOS_PERMITIDOS, MODELOS_RESERVA } from './modelos.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Modelo usado quando o app não escolhe nenhum. O secret OPENROUTER_MODEL
 * continua valendo como sobreposição do projeto.
 */
const MODELO_DO_PROJETO = Deno.env.get('OPENROUTER_MODEL') ?? MODELO_PADRAO;

/**
 * Decide qual modelo atende esta requisição.
 *
 * O app manda a escolha do usuário, mas só ids da lista permitida passam —
 * aceitar qualquer string daria a um app modificado o poder de pedir o modelo
 * mais caro do catálogo, na conta do dono do projeto.
 */
function escolherModelo(pedido: unknown): string {
  return typeof pedido === 'string' && MODELOS_PERMITIDOS.has(pedido) ? pedido : MODELO_DO_PROJETO;
}

/**
 * Status que valem uma nova tentativa em outro modelo.
 *
 * 503 e 429 sao o pool gratuito saturado ou o limite batido — condicao do
 * provedor, nao da nossa requisicao. Repetir no mesmo modelo nao adianta;
 * trocar, sim.
 */
const RETENTAVEIS = new Set([408, 429, 502, 503, 504, 524]);

/**
 * O modelo escolhido primeiro, depois os gratuitos como reserva.
 *
 * Limitado a tres para a espera nao virar eternidade: cada tentativa custa uma
 * ida ao provedor, e a tela fica em "analisando" o tempo todo.
 */
function filaDeModelos(escolhido: string): string[] {
  return [escolhido, ...MODELOS_RESERVA.filter((m) => m !== escolhido)].slice(0, 3);
}

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
 * Extrai o objeto JSON da resposta, ou `null` se não houver.
 *
 * Com `response_format` honrado, o conteúdo já vem JSON puro. Sem isso, modelos
 * costumam embrulhar em cercas de código ou emendar uma frase antes. Aqui a
 * cerca é removida e, se ainda sobrar texto, pegamos do primeiro `{` ao último
 * `}`.
 *
 * Devolve `null` em vez de lançar: modelo que enrola ou se recusa não é um erro
 * de servidor, é um palpite ruim — e palpite ruim tem tratamento próprio.
 */
function extrairJson(texto: string): Record<string, unknown> | null {
  const limpo = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  const tentar = (candidato: string) => {
    try {
      const valor = JSON.parse(candidato);
      return valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };

  const direto = tentar(limpo);
  if (direto) return direto;

  const inicio = limpo.indexOf('{');
  const fim = limpo.lastIndexOf('}');
  if (inicio === -1 || fim <= inicio) return null;

  return tentar(limpo.slice(inicio, fim + 1));
}

/** Primeira frase do texto, para aproveitar a resposta de um modelo tagarela. */
function primeiraFrase(texto: string): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  const fim = limpo.search(/[.!?]/);
  return (fim > 0 ? limpo.slice(0, fim) : limpo).slice(0, 60).trim();
}

/**
 * Tira o texto da resposta, seja qual for o formato.
 *
 * `message.content` costuma ser uma string, mas alguns modelos devolvem uma
 * lista de partes (`[{type:'text',text:'...'}]`) e os de raciocínio às vezes
 * deixam `content` vazio e põem tudo em `reasoning`. Assumir só o primeiro
 * formato foi o que fez a função responder "resposta vazia".
 */
function extrairConteudo(dados: unknown): string {
  const mensagem = (dados as { choices?: { message?: Record<string, unknown> }[] })?.choices?.[0]
    ?.message;
  if (!mensagem) return '';

  const { content, reasoning } = mensagem as { content?: unknown; reasoning?: unknown };

  if (typeof content === 'string' && content.trim()) return content;

  if (Array.isArray(content)) {
    const texto = content
      .map((parte) => (typeof parte === 'string' ? parte : ((parte as { text?: string })?.text ?? '')))
      .join('')
      .trim();
    if (texto) return texto;
  }

  // Último recurso: o JSON pode ter saído junto do raciocínio.
  if (typeof reasoning === 'string' && reasoning.trim()) return reasoning;

  return '';
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
  let modelo: string;

  try {
    const corpo = await req.json();
    imagemBase64 = String(corpo.imagemBase64 ?? '');
    mimeType = String(corpo.mimeType ?? 'image/jpeg');
    modelo = escolherModelo(corpo.modelo);
  } catch {
    return json({ erro: 'Corpo inválido: esperado JSON.' }, 400);
  }

  if (!imagemBase64) return json({ erro: 'Faltou "imagemBase64".' }, 400);

  // O app reduz a foto para ~768px antes de enviar (~60-120 KB de base64).
  // Este teto existe para quem chamar a função por fora.
  if (imagemBase64.length > 1_500_000) {
    return json({ erro: 'Imagem grande demais — reduza antes de enviar.' }, 413);
  }

  const fila = filaDeModelos(modelo);
  let ultimoErro = 'sem detalhe';
  let ultimoStatus = 502;

  try {
    for (const candidato of fila) {
      const resposta = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${chave}`,
          'Content-Type': 'application/json',
          'X-Title': 'LootScanner',
        },
        body: JSON.stringify({
          model: candidato,

          // Vários modelos com visão do OpenRouter — inclusive todos os gratuitos —
          // são de raciocínio: gastam tokens "pensando" antes de escrever. Com um
          // teto apertado, o raciocínio consome tudo e `content` volta vazio.
          // Escolher entre 53 itens não precisa de cadeia de pensamento, então
          // pedimos para desligar; e o teto fica folgado para quem ignorar o pedido.
          max_tokens: 1500,
          reasoning: { enabled: false },
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
        ultimoStatus = resposta.status;
        ultimoErro = (await resposta.text()).slice(0, 300);
        console.error('[openrouter]', candidato, resposta.status, ultimoErro);

        // Indisponibilidade do provedor: vale tentar o próximo da fila.
        if (RETENTAVEIS.has(resposta.status)) continue;

        return json(
          { erro: `O serviço de visão respondeu ${resposta.status}.`, detalhe: ultimoErro },
          502,
        );
      }

      const dados = await resposta.json();
      const conteudo = extrairConteudo(dados);

      if (!conteudo) {
        // Sem texto em nenhum dos formatos conhecidos: o motivo costuma estar em
        // `finish_reason` (`length` = teto de tokens estourado).
        const motivo = dados?.choices?.[0]?.finish_reason ?? 'desconhecido';
        console.error('[identificar-loot] sem conteudo, finish_reason:', motivo, JSON.stringify(dados).slice(0, 400));
        return json({ erro: `O modelo não devolveu texto (motivo: ${motivo}).` }, 502);
      }

      const bruto = extrairJson(conteudo);

      if (!bruto) {
        // O modelo respondeu, mas em prosa. Aproveita o que deu e segue: melhor
        // um "desconhecido" com uma pista do que um erro na cara do usuário.
        console.error('[identificar-loot] resposta sem JSON:', conteudo.slice(0, 300));
        return json({
          provider: `openrouter:${candidato}`,
          guesses: [{ catalogId: 'desconhecido', confidence: 0 }],
          rarityHint: null,
          flavor: '',
          descricao: primeiraFrase(conteudo),
        });
      }

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
        provider: `openrouter:${candidato}`,
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
    }

    // A fila acabou sem ninguém conseguir responder.
    console.error('[identificar-loot] todos indisponíveis:', fila.join(', '));
    return json(
      {
        erro: `Nenhum modelo disponível agora (último: ${ultimoStatus}). Tente de novo em instantes ou escolha outro no Perfil.`,
        detalhe: ultimoErro,
      },
      503,
    );
  } catch (erro) {
    const nome = erro instanceof Error ? erro.name : '';
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    console.error('[identificar-loot]', nome, detalhe);

    // TimeoutError vem do AbortSignal.timeout acima.
    if (nome === 'TimeoutError' || /abort/i.test(detalhe)) {
      return json({ erro: 'O serviço de visão demorou demais para responder.' }, 504);
    }

    return json({ erro: `Falha ao identificar a imagem: ${detalhe}` }, 502);
  }
});
