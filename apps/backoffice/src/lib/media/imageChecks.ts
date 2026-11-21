/** Para qué se va a usar la foto: decide el tamaño mínimo recomendado. */
export type ImagePurpose = 'hero' | 'dish' | 'logo' | 'any';

export interface ImageSize {
  width: number;
  height: number;
}

export interface ImageCheck {
  /** Motivo por el que no se puede subir. */
  blocker?: string;
  /** Avisos que no impiden subirla. */
  warnings: string[];
}

// Los mismos tipos y el mismo tope que valida el api en `POST /media/upload-url`.
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_KB = 10_000;

const HEAVY_KB = 2_000;
const MIN_WIDTH: Record<ImagePurpose, number> = { hero: 1600, dish: 800, logo: 500, any: 800 };

/** Con esta lista en `accept`, iOS convierte las fotos HEIC a JPG al elegirlas. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',');

export function formatFileSize(kb: number): string {
  if (kb < 1000) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
}

/** `null` si el navegador no sabe abrir el archivo como imagen. */
export function readImageSize(file: File): Promise<ImageSize | null> {
  if (!file.type.startsWith('image/')) return Promise.resolve(null);
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export function checkImage(file: File, size: ImageSize | null, purpose: ImagePurpose): ImageCheck {
  const kb = file.size / 1024;

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { blocker: 'Este tipo de archivo no sirve. Sube la foto en JPG, PNG o WebP.', warnings: [] };
  }
  if (Math.ceil(kb) > MAX_KB) {
    return { blocker: `Pesa ${formatFileSize(kb)} y el máximo son 10 MB. Redúcela antes de subirla.`, warnings: [] };
  }

  const warnings: string[] = [];
  if (kb > HEAVY_KB) {
    warnings.push(`Pesa ${formatFileSize(kb)}. La web tardará más en cargar; lo ideal es que pese menos de 2 MB.`);
  }
  if (size && size.width < MIN_WIDTH[purpose]) {
    warnings.push(
      purpose === 'hero'
        ? `Mide ${size.width} px de ancho. En la portada se verá borrosa en pantallas grandes; mejor al menos ${MIN_WIDTH.hero} px.`
        : `Mide ${size.width} px de ancho. Puede verse borrosa; mejor al menos ${MIN_WIDTH[purpose]} px.`
    );
  }
  return { warnings };
}
