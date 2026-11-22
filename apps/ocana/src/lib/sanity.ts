import { crearSanityClient, crearImageBuilder, type ImageBuilder } from '@hosteleria/sanity-client';
import { createImageBuilder } from '@hosteleria/content-client';

// Con CONTENT_API_URL la landing lee del api propio; sin ella, de Sanity (hasta
// que se retire). La variable se fija en el despliegue.
export const contentApiUrl: string | undefined = import.meta.env.CONTENT_API_URL || undefined;

const projectId = import.meta.env.SANITY_PROJECT_ID;
const dataset = import.meta.env.SANITY_DATASET || 'production';

if (!contentApiUrl && !projectId) {
  throw new Error(
    'Falta CONTENT_API_URL (api propio) o SANITY_PROJECT_ID. Crea apps/ocana/.env desde .env.example.',
  );
}

export const sanity = contentApiUrl ? null : crearSanityClient({ projectId, dataset });
export const img: ImageBuilder = sanity ? crearImageBuilder(sanity) : createImageBuilder();
