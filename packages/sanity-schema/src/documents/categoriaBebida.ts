import { defineField, defineType } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18n';
import { filtroEspaciosDelMismoRestaurante } from '../lib/referenciaEspacio';

export const categoriaBebida = defineType({
  name: 'categoriaBebida',
  title: 'Categoría de bebida',
  type: 'document',
  fields: [
    defineField({
      name: 'espacio',
      title: 'Espacio',
      type: 'reference',
      to: [{ type: 'espacio' }],
      options: filtroEspaciosDelMismoRestaurante(),
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
      description:
        'Menor = aparece antes. Ej: Cocteles 10, Cervezas 20, Sin alcohol 30, Café 40.',
      initialValue: 10,
      validation: (r) => r.required(),
    }),
  ],
  orderings: [{ title: 'Por orden', name: 'ordenAsc', by: [{ field: 'orden', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'nombre.0.value',
      espacio: 'espacio.nombre',
      orden: 'orden',
    },
    prepare: ({ title, espacio, orden }) => ({
      title: title ?? 'Sin nombre',
      subtitle: `${espacio ?? '—'} · orden ${orden ?? '?'}`,
    }),
  },
});
