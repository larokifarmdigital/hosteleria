/**
 * Filter para el campo `espacio` (reference) en categoriaVino/vino/
 * categoriaPlato/plato.
 *
 * Cuando el editor abre el picker de "Espacio" en un doc que YA tiene un
 * espacio asignado, restringimos el listado a espacios del mismo restaurante
 * — así no se puede mover accidentalmente un vino del Restaurant Ocaña a la
 * Sala de Casabella. Al crear un doc nuevo sin espacio previo (raro; el
 * structure builder inyecta initial values), el filter no aplica y ve todos.
 */
export function filtroEspaciosDelMismoRestaurante() {
  return {
    filter: ({ document }: { document?: Record<string, unknown> }) => {
      const espacio = document?.espacio as { _ref?: string } | undefined;
      const currentEspacioRef = espacio?._ref;
      if (!currentEspacioRef) return {};
      return {
        filter: 'restaurante._ref in *[_id == $eid].restaurante._ref',
        params: { eid: currentEspacioRef }
      };
    }
  };
}

/**
 * Filter para el campo `categoria` en vino/plato. Si el doc ya tiene
 * `espacio` seleccionado, restringimos las categorías al mismo espacio para
 * que no se pueda asignar un vino de Apotheke a una categoría de la Sala.
 */
export function filtroCategoriasDelMismoEspacio() {
  return {
    filter: ({ document }: { document?: Record<string, unknown> }) => {
      const espacio = document?.espacio as { _ref?: string } | undefined;
      const currentEspacioRef = espacio?._ref;
      if (!currentEspacioRef) return {};
      return {
        filter: 'espacio._ref == $eid',
        params: { eid: currentEspacioRef }
      };
    }
  };
}
