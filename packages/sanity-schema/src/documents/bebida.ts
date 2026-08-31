import { defineField, defineType } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18n';
import {
  filtroCategoriasDelMismoEspacio,
  filtroEspaciosDelMismoRestaurante
} from '../lib/referenciaEspacio';

/**
 * Bebida — carta paralela a Platos y Vinos.
 *
 * Cubre cocteles, café, cervezas, infusiones, softs, aguas… es decir todo
 * lo que no es plato ni vino. Se filtra por espacio: Apotheke suele tenerlas
 * a fondo, el Restaurant a veces solo un café/agua para acompañar comida.
 *
 * A diferencia de `vino.nombre` (string sin traducir por ser nombre propio
 * de bodega), aquí `nombre` es i18n porque "Café con leche" / "Cafè amb llet"
 * / "Coffee with milk" tienen sentido traducidos.
 */
export const bebida = defineType({
  name: 'bebida',
  title: 'Bebida',
  type: 'document',
  fields: [
    defineField({
      name: 'espacio',
      title: 'Espacio',
      description: 'Espacio (Restaurante, Café, Coctelería…) al que pertenece esta bebida.',
      type: 'reference',
      to: [{ type: 'espacio' }],
      options: filtroEspaciosDelMismoRestaurante(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'categoria',
      title: 'Categoría',
      type: 'reference',
      to: [{ type: 'categoriaBebida' }],
      options: filtroCategoriasDelMismoEspacio(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'nombre',
      title: 'Nombre',
      type: 'internationalizedArrayString',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'nota',
      title: 'Nota (opcional)',
      description: 'Descripción corta o ingredientes clave. Se puede dejar vacío.',
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
      description: 'Desactivar para ocultar sin borrar (útil para bebidas de temporada).',
      initialValue: true,
    }),
  ],
  orderings: [{ title: 'Por orden', name: 'ordenAsc', by: [{ field: 'orden', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'nombre.0.value',
      precio: 'precio',
      activo: 'activo',
      espacio: 'espacio.nombre',
    },
    prepare: ({ title, precio, activo, espacio }) => ({
      title: `${activo ? '' : '⏸ '}${title ?? 'Sin nombre'}`,
      subtitle: `${espacio ?? '—'} · ${precio ?? '?'} €`,
    }),
  },
});
