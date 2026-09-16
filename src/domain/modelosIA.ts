/**
 * Modelos de visão que o app oferece para identificar os itens.
 *
 * Esta lista é a **permitida**: a Edge Function recusa qualquer id que não
 * esteja aqui. Sem isso, um app modificado poderia pedir o modelo mais caro do
 * catálogo e torrar o crédito do dono do projeto.
 *
 * Todos foram conferidos na API do OpenRouter: aceitam imagem na entrada e
 * estavam disponíveis quando a lista foi montada. Ao mexer aqui, rode
 * `npm run gen:edge` para atualizar a cópia que a função usa.
 */

export interface ModeloIA {
  /** Slug do OpenRouter. */
  id: string;
  /** Nome curto, para a tela. */
  nome: string;
  fornecedor: string;
  gratuito: boolean;
  /** Uma linha sobre o que esperar deste modelo. */
  nota: string;
}

export const MODELOS_IA: ModeloIA[] = [
  /* ---------------- gratuitos ---------------- */
  {
    id: 'nex-agi/nex-n2.5-pro:free',
    nome: 'Nex Pro',
    fornecedor: 'Nex AGI',
    gratuito: true,
    nota: 'Equilíbrio entre precisão e velocidade. Boa primeira escolha.',
  },
  {
    id: 'nex-agi/nex-n2.5-mini:free',
    nome: 'Nex Mini',
    fornecedor: 'Nex AGI',
    gratuito: true,
    nota: 'Mais rápido que o Pro, um pouco menos preciso.',
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    nome: 'Dots 3',
    fornecedor: 'Dots Studio',
    gratuito: true,
    nota: 'Costuma descrever bem objetos do dia a dia.',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    nome: 'Gemma 31B',
    fornecedor: 'Google',
    gratuito: true,
    nota: 'O maior dos gratuitos do Google. Mais lento, porém cuidadoso.',
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    nome: 'Gemma 26B',
    fornecedor: 'Google',
    gratuito: true,
    nota: 'Versão mais leve, responde mais rápido.',
  },
  {
    id: 'inclusionai/ling-3.0-flash-vl:free',
    nome: 'Ling Flash',
    fornecedor: 'inclusionAI',
    gratuito: true,
    nota: 'Feito especificamente para imagens. Rápido.',
  },
  {
    id: 'thinkingmachines/inkling:free',
    nome: 'Inkling',
    fornecedor: 'Thinking Machines',
    gratuito: true,
    nota: 'Alternativa para quando os outros estiverem no limite diário.',
  },

  /* ---------------- exigem crédito na conta do OpenRouter ---------------- */
  {
    id: 'anthropic/claude-sonnet-5',
    nome: 'Claude Sonnet 5',
    fornecedor: 'Anthropic',
    gratuito: false,
    nota: 'O mais preciso da lista. Cerca de US$ 0,006 por item.',
  },
  {
    id: 'meta-llama/llama-4-scout',
    nome: 'Llama 4 Scout',
    fornecedor: 'Meta',
    gratuito: false,
    nota: 'Pago, mas bem barato. Responde rápido.',
  },
];

/** Usado quando ninguém escolheu nada ainda. */
export const MODELO_PADRAO = MODELOS_IA[0];

const POR_ID = new Map(MODELOS_IA.map((m) => [m.id, m]));

export function acharModelo(id: string | null | undefined): ModeloIA {
  return (id && POR_ID.get(id)) || MODELO_PADRAO;
}
