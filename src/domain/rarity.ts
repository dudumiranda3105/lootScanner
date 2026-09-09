import type { IconName } from '../components/icons';
import { CategoryId, RarityId } from './types';

export interface RarityDef {
  id: RarityId;
  label: string;
  /** Ordem crescente de raridade — usada para ordenar o inventário. */
  order: number;
  color: string;
  /** Fundo translúcido usado nos cards e selos. */
  tint: string;
  xp: number;
  icon: IconName;
}

export const RARITIES: Record<RarityId, RarityDef> = {
  comum: {
    id: 'comum',
    label: 'Comum',
    order: 0,
    color: '#9AA0C0',
    tint: 'rgba(154,160,192,0.14)',
    xp: 10,
    icon: 'circle-outline',
  },
  incomum: {
    id: 'incomum',
    label: 'Incomum',
    order: 1,
    color: '#4BC58A',
    tint: 'rgba(75,197,138,0.14)',
    xp: 20,
    icon: 'hexagon-outline',
  },
  raro: {
    id: 'raro',
    label: 'Raro',
    order: 2,
    color: '#4C8DE2',
    tint: 'rgba(76,141,226,0.16)',
    xp: 40,
    icon: 'rhombus-outline',
  },
  epico: {
    id: 'epico',
    label: 'Épico',
    order: 3,
    color: '#A45CE8',
    tint: 'rgba(164,92,232,0.16)',
    xp: 70,
    icon: 'star-four-points-outline',
  },
  lendario: {
    id: 'lendario',
    label: 'Lendário',
    order: 4,
    color: '#E8B84B',
    tint: 'rgba(232,184,75,0.18)',
    xp: 120,
    icon: 'diamond-stone',
  },
};

export const RARITY_ORDER: RarityId[] = ['comum', 'incomum', 'raro', 'epico', 'lendario'];

export interface CategoryDef {
  id: CategoryId;
  label: string;
  emblem: string;
  /** Raridade atribuída por padrão a qualquer item desta categoria. */
  rarity: RarityId;
}

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  material_escolar: {
    id: 'material_escolar',
    label: 'Material escolar',
    emblem: '📚',
    rarity: 'comum',
  },
  vestuario: { id: 'vestuario', label: 'Vestuário', emblem: '🧥', rarity: 'incomum' },
  acessorio: { id: 'acessorio', label: 'Acessório', emblem: '🎒', rarity: 'incomum' },
  eletronico: { id: 'eletronico', label: 'Eletrônico', emblem: '🔌', rarity: 'raro' },
  documento: { id: 'documento', label: 'Documento e chaves', emblem: '🗝️', rarity: 'epico' },
  valioso: { id: 'valioso', label: 'Item de valor', emblem: '💎', rarity: 'lendario' },
};

export const CATEGORY_ORDER: CategoryId[] = [
  'material_escolar',
  'vestuario',
  'acessorio',
  'eletronico',
  'documento',
  'valioso',
];

export function rarityOf(category: CategoryId, override?: RarityId): RarityId {
  return override ?? CATEGORIES[category].rarity;
}
