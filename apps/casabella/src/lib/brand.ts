/**
 * Divide el nombre del restaurant en dos partes para render con estilos distintos:
 * "Casa bella" → ["Casa", "bella"] (segunda parte va en <em>).
 * Si no matchea "Casa/La/El", parte1 vacía y parte2 = nombre completo.
 */
export function splitBrandName(nombre: string): { parte1: string; parte2: string } {
  const partes = nombre.match(/^(Casa|La|El)?\s?(.*)$/);
  return {
    parte1: partes?.[1] ?? '',
    parte2: partes?.[2] ?? nombre,
  };
}
