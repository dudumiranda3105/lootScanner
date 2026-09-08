/**
 * Paleta e tokens visuais do LootScanner.
 * Tema escuro estilo "menu de RPG": fundo grafite, dourado como cor de destaque.
 */

export const colors = {
  bg: '#0E0F16',
  bgElevated: '#171926',
  surface: '#1E2131',
  surfaceAlt: '#262A3D',
  border: '#333853',
  borderStrong: '#4A5178',

  text: '#ECEEF8',
  textMuted: '#9AA0C0',
  textFaint: '#6B7196',

  gold: '#E8B84B',
  goldDim: '#8A6E20',

  danger: '#E2574C',
  success: '#4BC58A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const font = {
  /** Fonte monoespaçada dá o ar de "terminal / ficha de personagem". */
  mono: 'monospace',
} as const;
