// GERADO POR scripts/gen-edge.mjs — não edite na mão.
// Fonte da verdade: src/domain/modelosIA.ts  (rode: npm run gen:edge)

/**
 * Modelos que a função aceita. O app manda qual usar, e só estes passam:
 * sem a lista, um app modificado poderia pedir o modelo mais caro do catálogo
 * e torrar o crédito do dono do projeto.
 */
export const MODELOS_PERMITIDOS = new Set<string>([
  'nex-agi/nex-n2.5-pro:free',
  'nex-agi/nex-n2.5-mini:free',
  'dots-studio/dots-3-note-preview:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'inclusionai/ling-3.0-flash-vl:free',
  'thinkingmachines/inkling:free',
  'anthropic/claude-sonnet-5',
  'meta-llama/llama-4-scout',
]);

/**
 * Só os gratuitos, na ordem da lista. Servem de reserva quando o modelo
 * escolhido responde que está indisponível — o pool gratuito satura com
 * frequência. Nunca caímos para um pago: gastaria crédito sem o usuário pedir.
 */
export const MODELOS_RESERVA: string[] = [
  'nex-agi/nex-n2.5-pro:free',
  'nex-agi/nex-n2.5-mini:free',
  'dots-studio/dots-3-note-preview:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'inclusionai/ling-3.0-flash-vl:free',
  'thinkingmachines/inkling:free',
];

/** Usado quando o app não manda nada, ou manda algo fora da lista. */
export const MODELO_PADRAO = 'nex-agi/nex-n2.5-pro:free';
