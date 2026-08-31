import { defineConfig, defineField, defineArrayMember } from 'sanity';
import type { SanityClient } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { internationalizedArray } from 'sanity-plugin-internationalized-array';
import { schemaTypes } from '@hosteleria/sanity-schema';
import { structure } from './src/structure';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

if (!projectId) {
  throw new Error(
    'Falta SANITY_STUDIO_PROJECT_ID. Crea apps/studio/.env a partir de .env.example y pega el ID que te dio Sanity al crear el proyecto.',
  );
}

// Fallback mínimo por si aún no hay docs `idioma` creados en el dataset.
const IDIOMAS_FALLBACK: Array<{ id: string; title: string }> = [
  { id: 'es', title: 'Español' },
];

/**
 * Cache a nivel de módulo: una sola lista estable para todas las llamadas.
 * Sin esto, el plugin sanity-plugin-internationalized-array recibe una nueva
 * referencia de array en cada render → bucle infinito de re-render
 * ("Maximum update depth exceeded") al abrir cualquier documento con campos i18n.
 */
let idiomasCache: Array<{ id: string; title: string }> | null = null;
let idiomasPromesa: Promise<Array<{ id: string; title: string }>> | null = null;

const cargarIdiomas = async (client: SanityClient) => {
  if (idiomasCache) return idiomasCache;
  if (idiomasPromesa) return idiomasPromesa;
  idiomasPromesa = (async () => {
    try {
      const lista = await client.fetch<{ id?: string; title?: string }[]>(
        `*[_type=="idioma"]{ "id": codigo, "title": nombre } | order(title asc)`,
      );
      const limpia = (lista ?? [])
        .filter((i) => i.id && i.title)
        .map((i) => ({ id: i.id as string, title: i.title as string }));
      idiomasCache = limpia.length > 0 ? limpia : IDIOMAS_FALLBACK;
    } catch {
      idiomasCache = IDIOMAS_FALLBACK;
    }
    return idiomasCache;
  })();
  return idiomasPromesa;
};

export default defineConfig({
  name: 'default',
  title: 'Hosteleria CMS',
  projectId,
  dataset,
  /**
   * Al pulsar "+ Create" en una lista de vinos/platos/categorías bajo un
   * espacio, el structure builder invoca uno de estos initial value templates
   * pasando `espacioId` como parámetro. El nuevo doc arranca con
   * `espacio: ref(espacioId)` y el editor no tiene que elegir espacio a mano
   * (evita asignar por error contenido a otro restaurante).
   *
   * Ojo: en Sanity v3 estos templates van en `schema.templates`, no en
   * `document.templates` (esa key es para el menú "+ Create" del top-nav).
   */
  document: {
    // Ocultamos los templates "hijos-de-espacio" del menú global de creación:
    // sin `espacioId` no tienen sentido y confundirían al editor.
    newDocumentOptions: (prev, { creationContext }) => {
      if (creationContext.type === 'global') {
        return prev.filter(
          t =>
            ![
              'categoriaVinoEnEspacio',
              'vinoEnEspacio',
              'categoriaPlatoEnEspacio',
              'platoEnEspacio',
              'categoriaBebidaEnEspacio',
              'bebidaEnEspacio'
            ].includes(t.templateId)
        );
      }
      return prev;
    }
  },
  schema: {
    types: schemaTypes,
    templates: prev => [
      ...prev,
      {
        id: 'categoriaVinoEnEspacio',
        title: 'Categoría de vino (en este espacio)',
        schemaType: 'categoriaVino',
        parameters: [{ name: 'espacioId', type: 'string' }],
        value: ({ espacioId }: { espacioId: string }) => ({
          espacio: { _type: 'reference', _ref: espacioId }
        })
      },
      {
        id: 'vinoEnEspacio',
        title: 'Vino (en este espacio)',
        schemaType: 'vino',
        parameters: [{ name: 'espacioId', type: 'string' }],
        value: ({ espacioId }: { espacioId: string }) => ({
          espacio: { _type: 'reference', _ref: espacioId }
        })
      },
      {
        id: 'categoriaPlatoEnEspacio',
        title: 'Categoría de plato (en este espacio)',
        schemaType: 'categoriaPlato',
        parameters: [{ name: 'espacioId', type: 'string' }],
        value: ({ espacioId }: { espacioId: string }) => ({
          espacio: { _type: 'reference', _ref: espacioId }
        })
      },
      {
        id: 'platoEnEspacio',
        title: 'Plato (en este espacio)',
        schemaType: 'plato',
        parameters: [{ name: 'espacioId', type: 'string' }],
        value: ({ espacioId }: { espacioId: string }) => ({
          espacio: { _type: 'reference', _ref: espacioId }
        })
      },
      {
        id: 'categoriaBebidaEnEspacio',
        title: 'Categoría de bebida (en este espacio)',
        schemaType: 'categoriaBebida',
        parameters: [{ name: 'espacioId', type: 'string' }],
        value: ({ espacioId }: { espacioId: string }) => ({
          espacio: { _type: 'reference', _ref: espacioId }
        })
      },
      {
        id: 'bebidaEnEspacio',
        title: 'Bebida (en este espacio)',
        schemaType: 'bebida',
        parameters: [{ name: 'espacioId', type: 'string' }],
        value: ({ espacioId }: { espacioId: string }) => ({
          espacio: { _type: 'reference', _ref: espacioId }
        })
      }
    ]
  },
  plugins: [
    structureTool({ structure }),
    internationalizedArray({
      languages: cargarIdiomas,
      // Al hacer "Add language" en un campo i18n vacío, el plugin pre-crea entradas
      // para estos idiomas. Si añades un idioma nuevo al catálogo (pt, de…),
      // acuérdate de añadirlo también aquí.
      defaultLanguages: ['ca', 'es', 'en', 'fr', 'it'],
      fieldTypes: [
        'string',
        defineField({
          name: 'text',
          type: 'text',
          rows: 3,
          title: 'Texto largo',
        }),
        defineField({
          name: 'portableText',
          type: 'array',
          title: 'Texto enriquecido',
          of: [defineArrayMember({ type: 'block' })],
        }),
      ],
    }),
    visionTool(),
  ]
});
