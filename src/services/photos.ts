import { Directory, File, Paths } from 'expo-file-system';

const FOLDER = 'loot-photos';

/**
 * A câmera grava a foto no cache, que o sistema pode limpar a qualquer momento.
 * Aqui a imagem é copiada para o diretório de documentos do app, que é permanente.
 * Se qualquer passo falhar, devolvemos a URI original — o registro do item nunca
 * deve ser perdido por causa da foto.
 */
export async function persistPhoto(sourceUri: string, itemId: string): Promise<string> {
  try {
    const folder = new Directory(Paths.document, FOLDER);
    if (!folder.exists) folder.create({ intermediates: true });

    const extension = guessExtension(sourceUri);
    const target = new File(folder, `${itemId}.${extension}`);
    if (target.exists) target.delete();

    new File(sourceUri).copy(target);
    return target.uri;
  } catch (error) {
    console.warn('[photos] não foi possível arquivar a foto:', error);
    return sourceUri;
  }
}

export async function deletePhoto(photoUri: string | null): Promise<void> {
  if (!photoUri || !photoUri.includes(FOLDER)) return;
  try {
    const file = new File(photoUri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('[photos] não foi possível apagar a foto:', error);
  }
}

function guessExtension(uri: string): string {
  const match = /\.([a-zA-Z0-9]{3,4})(?:\?|$)/.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}
