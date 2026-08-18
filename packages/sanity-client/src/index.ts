import { createClient, type ClientConfig, type SanityClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

export type CrearSanityClientOpts = {
  projectId: string;
  dataset: string;
  apiVersion?: string;
  useCdn?: boolean;
  perspective?: ClientConfig['perspective'];
};

/**
 * Fábrica del cliente Sanity con la config por defecto que comparten todas las
 * apps del monorepo. Cada app pasa su `projectId` y `dataset` desde env vars.
 */
export function crearSanityClient(opts: CrearSanityClientOpts): SanityClient {
  const {
    projectId,
    dataset,
    apiVersion = '2024-10-01',
    useCdn = false,
    perspective = 'published',
  } = opts;
  return createClient({ projectId, dataset, apiVersion, useCdn, perspective });
}

export type ImageBuilder = {
  /** URL de una imagen de Sanity, o undefined si el input es falsy. */
  url(source: SanityImageSource | null | undefined): string | undefined;
  /** URL con ancho concreto (auto format + fit max). */
  width(source: SanityImageSource | null | undefined, w: number): string | undefined;
  /** PNG cuadrado exacto (crop). Ideal para favicons, apple-touch e iconos PWA. */
  pngSquare(source: SanityImageSource | null | undefined, size: number): string | undefined;
};

export function crearImageBuilder(client: SanityClient): ImageBuilder {
  const builder = imageUrlBuilder(client);
  return {
    url(source) {
      if (!source) return undefined;
      return builder.image(source).auto('format').fit('max').url();
    },
    width(source, w) {
      if (!source) return undefined;
      return builder.image(source).width(w).auto('format').fit('max').url();
    },
    pngSquare(source, size) {
      if (!source) return undefined;
      return builder.image(source).width(size).height(size).fit('crop').format('png').url();
    },
  };
}

export type { SanityClient, SanityImageSource };
