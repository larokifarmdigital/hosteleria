import { defineField, defineType } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18n';

export const categoriaPlato = defineType({
  name: 'categoriaPlato',
  title: 'Categoría de plato',
  type: 'document',
  fields: [
    defineField({
      name: 'restaurante',
      title: 'Restaurante',
      type: 'reference',
      to: [{ type: 'restaurante' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'nombre',
      title: 'Nombre',
      type: 'internationalizedArrayString',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'orden',
      title: 'Orden',
      type: 'number',
      description: 'Menor = aparece antes. Ej: Para picar 10, Fríos 20, De cocina 30.',
      initialValue: 10,
      validation: (r) => r.required(),
    }),
  ],
  orderings: [{ title: 'Por orden', name: 'ordenAsc', by: [{ field: 'orden', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'nombre.0.value',
      restaurante: 'restaurante.nombre',
      orden: 'orden',
    },
    prepare: ({ title, restaurante, orden }) => ({
      title: title ?? 'Sin nombre',
      subtitle: `${restaurante ?? '—'} · orden ${orden ?? '?'}`,
    }),
  },
});
