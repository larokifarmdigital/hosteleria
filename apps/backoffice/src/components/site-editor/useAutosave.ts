'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form';
import { firstErrorPath } from '@/lib/forms/errors';

export type SaveStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved'; at: number }
  /** Hay un campo mal escrito: no se guarda hasta corregirlo. */
  | { state: 'invalid'; path: string | null; message?: string }
  | { state: 'error' };

/** Comprobación propia antes de guardar: devuelve el campo que falla, o null si todo está bien. */
export type ExtraCheck<T> = (values: T) => { path: string; message: string } | null;

interface Options<T extends FieldValues> {
  form: UseFormReturn<T>;
  save: (values: T) => Promise<unknown>;
  check?: ExtraCheck<T>;
  /** Espera tras la última tecla antes de guardar. */
  delay?: number;
}

/**
 * Guarda solo, un momento después de dejar de escribir. Lo escrito mientras se
 * guarda no se pierde: el formulario toma lo enviado como su nuevo punto de
 * partida y, si sigue habiendo cambios, vuelve a guardar.
 */
export function useAutosave<T extends FieldValues>({ form, save, check, delay = 1000 }: Options<T>) {
  const [status, setStatusState] = useState<SaveStatus>({ state: 'idle' });
  const statusRef = useRef<SaveStatus>(status);
  const setStatus = (next: SaveStatus) => { statusRef.current = next; setStatusState(next); };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  // Siempre la última versión: el temporizador y la limpieza no deben quedarse con una antigua.
  const latest = useRef({ form, save, check });
  latest.current = { form, save, check };

  const run = useCallback(async (): Promise<void> => {
    if (inflight.current) { again.current = true; return inflight.current; }
    const job = (async () => {
      const { form, save, check } = latest.current;
      if (!form.formState.isDirty) {
        // Se ha vuelto a lo guardado (p. ej. se corrigió el campo dejándolo como estaba): el aviso sobra.
        if (statusRef.current.state === 'invalid' || statusRef.current.state === 'error') {
          if (await form.trigger()) setStatus({ state: 'saved', at: Date.now() });
        }
        return;
      }
      // Como el antiguo botón Guardar: se envía lo que sale de la validación (direcciones limpias,
      // precios convertidos…), no lo escrito tal cual.
      await form.handleSubmit(
        async data => {
          const typed = form.getValues();
          const problem = check?.(data);
          if (problem) {
            form.setError(problem.path as Parameters<typeof form.setError>[0], { message: problem.message });
            setStatus({ state: 'invalid', path: problem.path, message: problem.message });
            return;
          }
          setStatus({ state: 'saving' });
          try {
            await save(data);
            // Lo enviado pasa a ser lo guardado; lo que se haya escrito entretanto sigue en pantalla.
            form.reset(typed, { keepValues: true });
            setStatus({ state: 'saved', at: Date.now() });
          } catch {
            setStatus({ state: 'error' });
          }
        },
        errors => setStatus({ state: 'invalid', path: firstErrorPath(errors as FieldErrors) ?? null })
      )();
    })();
    inflight.current = job;
    try { await job; } finally { inflight.current = null; }
    if (again.current) { again.current = false; await run(); }
  }, []);

  /** Guarda ya lo pendiente (antes de publicar o de cambiar de idiomas). */
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    await run();
  }, [run]);

  useEffect(() => {
    const sub = form.watch((_value, info) => {
      // `reset` también avisa, pero sin campo: eso no es un cambio de quien edita.
      if (!info.name) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { timer.current = null; void run(); }, delay);
    });
    return () => {
      sub.unsubscribe();
      // Al salir del editor con algo a medio guardar, se guarda igualmente.
      if (timer.current) { clearTimeout(timer.current); timer.current = null; void run(); }
    };
  }, [form, run, delay]);

  return { status, flush, retry: flush };
}
