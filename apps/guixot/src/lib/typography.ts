/**
 * Divide un texto en "head + tail" donde tail es la última palabra.
 * Usado para el patrón editorial de Guixot: última palabra del H2 va en italic accent.
 *   splitLastWord("Cocina que se cuenta con cuchara")
 *     → { head: "Cocina que se cuenta con", tail: "cuchara" }
 */
export function splitLastWord(text: string | undefined | null): { head: string; tail: string } {
  const t = (text ?? '').trim();
  if (!t) return { head: '', tail: '' };
  const words = t.split(/\s+/);
  if (words.length < 2) return { head: t, tail: '' };
  return {
    head: words.slice(0, -1).join(' '),
    tail: words.at(-1) ?? '',
  };
}

/**
 * Divide en head + tail pero cortando por la mitad (para títulos largos):
 *   splitAtHalf("Cocina que se cuenta con cuchara")
 *     → { head: "Cocina que se cuenta", tail: "con cuchara" }
 */
export function splitAtHalf(text: string | undefined | null): { head: string; tail: string } {
  const t = (text ?? '').trim();
  if (!t) return { head: '', tail: '' };
  const words = t.split(/\s+/);
  if (words.length < 3) return { head: t, tail: '' };
  const cut = Math.floor(words.length / 2);
  return {
    head: words.slice(0, cut).join(' '),
    tail: words.slice(cut).join(' '),
  };
}
