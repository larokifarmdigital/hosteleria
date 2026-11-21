import type { ImageSize } from './imageChecks';

// Lado largo máximo: de sobra para una portada a pantalla completa en retina.
const MAX_SIDE = 2400;
// Por debajo de esto, y sin pasarse de tamaño, no compensa recomprimir.
const SKIP_BELOW_BYTES = 500 * 1024;
// GIF y AVIF se dejan como están: uno puede ser animado y el otro ya es eficiente.
const REDUCIBLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const EXTENSIONS: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

export interface OptimizedImage {
  file: File;
  size: ImageSize | null;
  /** Peso original en bytes, solo si la foto se ha reducido. */
  reducedFrom?: number;
}

/**
 * Reduce la foto en el navegador antes de subirla: la escala a 2400 px de lado
 * largo como mucho y la recomprime. Una foto de móvil pasa de varios MB a unos
 * cientos de KB. Si no se puede o no se gana nada, devuelve la original.
 */
export async function optimizeImage(file: File, size: ImageSize | null): Promise<OptimizedImage> {
  const original: OptimizedImage = { file, size };
  if (!size || !REDUCIBLE_TYPES.includes(file.type)) return original;

  const longSide = Math.max(size.width, size.height);
  if (longSide <= MAX_SIDE && file.size <= SKIP_BELOW_BYTES) return original;

  try {
    const scale = Math.min(1, MAX_SIDE / longSide);
    const target = { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext('2d');
    if (!context) return original;
    context.drawImage(await loadImage(file), 0, 0, target.width, target.height);

    // WebP conserva la transparencia de un PNG. Safari no sabe generarlo y
    // devuelve PNG: ahí se usa JPG si la foto no tiene transparencia, y si la
    // tiene se queda en PNG, que al menos sale reescalado.
    let blob = await toBlob(canvas, 'image/webp', 0.82);
    if (blob?.type !== 'image/webp') {
      const opaque = file.type === 'image/jpeg' || isOpaque(context, target);
      blob = opaque ? await toBlob(canvas, 'image/jpeg', 0.85) : await toBlob(canvas, 'image/png', 1);
    }
    if (!blob || blob.size > file.size * 0.9) return original;

    const extension = EXTENSIONS[blob.type];
    if (!extension) return original;
    const name = `${file.name.replace(/\.[^.]+$/, '')}.${extension}`;
    return { file: new File([blob], name, { type: blob.type }), size: target, reducedFrom: file.size };
  } catch {
    return original;
  }
}

function isOpaque(context: CanvasRenderingContext2D, size: ImageSize): boolean {
  const { data } = context.getImageData(0, 0, size.width, size.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return false;
  }
  return true;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}
