import { defineField, defineType } from 'sanity';

export const plato = defineType({
  name: 'plato',
  title: 'Plato',
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
      to: [{ type: 'categoriaPlato' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'nombre',
      title: 'Nombre del plato',
      type: 'internationalizedArrayString',
    }),
    defineField({
      name: 'nota',
      title: 'Descripción / nota',
      type: 'internationalizedArrayText',
    }),
    defineField({
      name: 'precio',
      title: 'Precio (€)',
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
      description: 'Desactivar para ocultar sin borrar (útil para platos de temporada).',
      initialValue: true,
    }),
  ],
  orderings: [{ title: 'Por orden', name: 'ordenAsc', by: [{ field: 'orden', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'nombre.0.value',
      precio: 'precio',
      activo: 'activo',
    },
    prepare: ({ title, precio, activo }) => ({
      title: `${activo ? '' : '⏸ '}${title ?? 'Sin nombre'}`,
      subtitle: precio != null ? `${precio} €` : '—',
    }),
  },
});
