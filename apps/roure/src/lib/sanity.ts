import { crearSanityClient, crearImageBuilder } from '@hosteleria/sanity-client';

const projectId = import.meta.env.SANITY_PROJECT_ID;
const dataset = import.meta.env.SANITY_DATASET || 'production';

if (!projectId) {
  throw new Error(
    'Falta SANITY_PROJECT_ID. Crea apps/pubilla/.env desde .env.example y pega el ID del proyecto Sanity.',
  );
}

export const sanity = crearSanityClient({ projectId, dataset });
export const img = crearImageBuilder(sanity);
