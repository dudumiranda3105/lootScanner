import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Largura que a foto assume antes de ir para a IA.
 *
 * Modelos de visão enxergam a imagem em blocos de poucas centenas de pixels —
 * mandar a resolução cheia da câmera não melhora o reconhecimento, só engorda o
 * upload e a conta. 768px é o suficiente para identificar um objeto.
 */
const LARGURA_IA = 768;

export interface FotoReduzida {
  uri: string;
  base64: string;
}

/**
 * Reduz a foto e devolve o base64 pronto para enviar.
 *
 * A foto da câmera em resolução cheia vira 1 a 4 MB de base64 no corpo do POST.
 * Num celular em rede móvel esse upload arrasta a ponto de parecer travado.
 * Depois daqui sobra algo entre 60 e 120 KB.
 *
 * A imagem original continua intacta: o inventário guarda a foto em tamanho
 * cheio, e esta versão reduzida existe só para a chamada da IA.
 */
export async function reduzirParaIA(uri: string): Promise<FotoReduzida> {
  const contexto = ImageManipulator.manipulate(uri).resize({ width: LARGURA_IA, height: null });
  const imagem = await contexto.renderAsync();

  const resultado = await imagem.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
    base64: true,
  });

  if (!resultado.base64) throw new Error('Não foi possível gerar o base64 da foto reduzida.');

  return { uri: resultado.uri, base64: resultado.base64 };
}
