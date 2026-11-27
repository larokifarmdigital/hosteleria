import { createImageBuilder, type ImageBuilder } from '@hosteleria/content-client';

// La landing lee su contenido del api del backoffice (`…/api`). La variable se fija en el despliegue.
export const contentApiUrl: string = import.meta.env.CONTENT_API_URL;

if (!contentApiUrl) {
  throw new Error('Falta CONTENT_API_URL (api del backoffice, por ejemplo https://<backoffice>/api). Crea apps/guixot/.env desde .env.example.');
}

export const img: ImageBuilder = createImageBuilder();
