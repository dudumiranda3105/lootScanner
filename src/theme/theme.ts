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

/**
 * Os nomes precisam ser exatamente as chaves passadas ao `useFonts` no layout
 * raiz (app/_layout.tsx) — é assim que o React Native encontra a família.
 */
export const font = {
  /** Títulos e nomes de item: serifada, com ar de placa de RPG. */
  display: 'Cinzel_700Bold',
  /** Números, selos e dados de ficha: o ar de terminal. */
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

/**
 * Sombra colorida usada para dar "brilho" na cor da raridade.
 * No Android só a `elevation` tem efeito, por isso o valor vai junto.
 */
export function glow(color: string, intensity = 0.5) {
  return {
    shadowColor: color,
    shadowOpacity: intensity,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  } as const;
}

/** Duração padrão das animações, em milissegundos. */
export const motion = {
  fast: 140,
  normal: 240,
  slow: 420,
} as const;
