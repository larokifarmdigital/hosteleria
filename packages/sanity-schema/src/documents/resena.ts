import { defineField, defineType } from 'sanity';

/**
 * Reseña asociada a un restaurante. Schema mínimo — se ampliará cuando el cliente
 * defina qué mostrar (autor, texto, valoración, foto, fuente, etc.).
 */
export const resena = defineType({
  name: 'resena',
  title: 'Reseña',
  type: 'document',
  fields: [
    defineField({
      name: 'restaurante',
      title: 'Restaurante',
      type: 'reference',
      to: [{ type: 'restaurante' }],
      validation: (r) => r.required(),
    }),
    // TODO: campos a definir con el cliente
  ],
  preview: {
    select: { restaurante: 'restaurante.nombre' },
    prepare: ({ restaurante }) => ({ title: `Reseña de ${restaurante ?? '—'}` }),
  },
});
