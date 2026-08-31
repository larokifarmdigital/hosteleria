import { defineField, defineType } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18n';
import { filtroEspaciosDelMismoRestaurante } from '../lib/referenciaEspacio';

export const categoriaVino = defineType({
  name: 'categoriaVino',
  title: 'Categoría de vino',
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
      description: 'Menor = aparece antes. Ej: Blancos 10, Tintos 20, Espumosos 30.',
      initialValue: 10,
      validation: (r) => r.required(),
    }),
  ],
  orderings: [{ title: 'Por orden', name: 'ordenAsc', by: [{ field: 'orden', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'nombre.0.value',
      espacio: 'espacio.nombre.0.value',
      orden: 'orden',
    },
    prepare: ({ title, espacio, orden }) => ({
      title: title ?? 'Sin nombre',
      subtitle: `${espacio ?? '—'} · orden ${orden ?? '?'}`,
    }),
  },
});
