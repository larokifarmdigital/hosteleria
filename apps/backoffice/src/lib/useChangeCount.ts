import { useRef } from 'react';

/** Sube cada vez que cambia el valor: sirve para volver a preguntar algo tras guardar o publicar. */
export function useChangeCount(value: unknown): number {
  const ref = useRef({ value, count: 0 });
  if (ref.current.value !== value) ref.current = { value, count: ref.current.count + 1 };
  return ref.current.count;
}
