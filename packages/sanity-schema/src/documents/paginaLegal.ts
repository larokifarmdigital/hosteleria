import { defineField, defineType } from 'sanity';

const TIPOS = [
  { title: 'Aviso legal', value: 'aviso-legal' },
  { title: 'Política de privacidad', value: 'privacidad' },
  { title: 'Política de cookies', value: 'cookies' },
];

export const paginaLegal = defineType({
  name: 'paginaLegal',
  title: 'Página legal',
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
      name: 'tipo',
      title: 'Tipo de página',
      type: 'string',
      options: { list: TIPOS, layout: 'radio' },
      validation: (r) => r.required(),
      description:
        'El tipo define la URL: /legal/aviso-legal · /legal/privacidad · /legal/cookies',
    }),
    defineField({
      name: 'titulo',
      title: 'Título (multiidioma)',
      type: 'internationalizedArrayString',
    }),
    defineField({
      name: 'contenido',
      title: 'Contenido (texto enriquecido multiidioma)',
      description:
        'Rellena en cada idioma activo. Puedes usar encabezados (H2/H3), listas, negritas y enlaces.',
      type: 'internationalizedArrayPortableText',
    }),
    defineField({
      name: 'ultimaActualizacion',
      title: 'Fecha de última actualización',
      type: 'date',
      description: 'Aparece al pie del texto legal. Actualízala cuando modifiques contenido.',
    }),
    defineField({
      name: 'orden',
      title: 'Orden en el footer',
      type: 'number',
      initialValue: 10,
    }),
  ],
  orderings: [{ title: 'Por orden', name: 'ordenAsc', by: [{ field: 'orden', direction: 'asc' }] }],
  preview: {
    select: { tipo: 'tipo', restaurante: 'restaurante.nombre' },
    prepare({ tipo, restaurante }) {
      const label = TIPOS.find((t) => t.value === tipo)?.title ?? tipo ?? '(sin tipo)';
      return { title: label, subtitle: restaurante ?? '—' };
    },
  },
});
