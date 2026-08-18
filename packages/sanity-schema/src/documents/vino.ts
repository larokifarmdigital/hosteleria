import { defineField, defineType } from 'sanity';

export const vino = defineType({
  name: 'vino',
  title: 'Vino',
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
      name: 'categoria',
      title: 'Categoría',
      type: 'reference',
      to: [{ type: 'categoriaVino' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'nombre',
      title: 'Nombre del vino',
      description: 'Nombre propio del vino/bodega. No se traduce.',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'region',
      title: 'Región / Denominación',
      type: 'string',
      description: 'Ej: Beaujolais, Mosel, Etna. No se traduce.',
    }),
    defineField({
      name: 'nota',
      title: 'Nota de cata',
      type: 'internationalizedArrayText',
    }),
    defineField({
      name: 'precioCopa',
      title: 'Precio copa (€)',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'precioBotella',
      title: 'Precio botella (€)',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'orden',
      title: 'Orden dentro de la categoría',
      type: 'number',
      initialValue: 10,
    }),
    defineField({
      name: 'activo',
      title: 'Publicado',
      type: 'boolean',
      description: 'Desactivar para ocultar sin borrar (útil para vinos de temporada).',
      initialValue: true,
    }),
  ],
  orderings: [{ title: 'Por orden', name: 'ordenAsc', by: [{ field: 'orden', direction: 'asc' }] }],
  preview: {
    select: { title: 'nombre', region: 'region', copa: 'precioCopa', botella: 'precioBotella', activo: 'activo' },
    prepare: ({ title, region, copa, botella, activo }) => ({
      title: `${activo ? '' : '⏸ '}${title}`,
      subtitle: `${region ?? '—'} · ${copa ?? '?'} / ${botella ?? '?'} €`,
    }),
  },
});
