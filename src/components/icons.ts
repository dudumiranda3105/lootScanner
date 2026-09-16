import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/**
 * Nome válido de ícone do MaterialCommunityIcons.
 * Tipar assim faz o TypeScript recusar nomes inventados em tempo de compilação —
 * um nome inexistente renderizaria um quadrado vazio na tela.
 */
export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Ícones da interface do app (abas, ações, estados). Os ícones dos *itens*
 * ficam no catálogo, em `src/domain/catalog.ts`.
 *
 * Todos os nomes daqui foram conferidos contra o glyphmap do pacote.
 */
export const ICON = {
  // abas
  inventario: 'bag-personal',
  escanear: 'camera-iris',
  mural: 'bulletin-board',
  perfil: 'shield-crown',

  // sincronização
  syncPendente: 'cloud-upload-outline',
  syncEnviado: 'cloud-check-outline',
  syncLocal: 'cellphone-lock',
  sincronizar: 'sync',

  // ações
  devolver: 'hand-heart-outline',
  excluir: 'trash-can-outline',
  salvar: 'content-save-outline',
  buscar: 'magnify',
  galeria: 'image-multiple-outline',
  entrar: 'login-variant',
  sair: 'logout-variant',

  // estados vazios e avisos
  vazioInventario: 'bag-personal-outline',
  vazioMural: 'map-search-outline',
  nadaEncontrado: 'magnify-close',
  erro: 'alert-circle-outline',
  info: 'information-outline',

  // ficha do item e perfil
  local: 'map-marker-outline',
  nivel: 'sword-cross',
  colecao: 'book-open-page-variant-outline',
  relogio: 'clock-outline',
  categoria: 'shape-outline',
  confianca: 'target',
} as const satisfies Record<string, IconName>;

export { MaterialCommunityIcons };
