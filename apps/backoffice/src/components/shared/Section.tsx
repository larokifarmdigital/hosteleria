'use client';

import { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: string;
  /** Aviso junto al título, p. ej. traducciones pendientes. */
  badge?: React.ReactNode;
  /** Una acción pequeña a la derecha del título. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Nivel del título de las tarjetas: 2 en una página normal, 3 dentro de una sección del editor (que ya tiene su `h2`). */
const HeadingLevel = createContext<2 | 3>(2);
export const SectionHeadingLevel = HeadingLevel.Provider;
/** Etiqueta del título de una tarjeta suelta, según dónde se pinte. */
export const useCardHeading = () => (useContext(HeadingLevel) === 3 ? 'h3' : 'h2');

/** Título de la sección del editor que se está viendo: un bloque que se llama igual no lo repite. */
const EditorSectionTitle = createContext<string | null>(null);
export const EditorSectionTitleProvider = EditorSectionTitle.Provider;

/**
 * Bloque de campos con su título. En una página normal es una tarjeta; dentro del
 * editor va sobre el fondo, sin caja, y los bloques se separan con una línea.
 */
export function Section({ title, description, badge, action, children, className }: Props) {
  const inEditor = useContext(HeadingLevel) === 3;
  const sectionTitle = useContext(EditorSectionTitle);

  if (inEditor) {
    // La sección ya dice cómo se llama y qué es: un único bloque con el mismo nombre sobra.
    const repeated = title === sectionTitle;
    return (
      <section aria-label={repeated ? title : undefined} className={cn('editor-block', className)}>
        {(!repeated || action) && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            {!repeated && (
              <div className="min-w-0 max-w-[62ch]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <h3 className="m-0 text-[15px] font-bold leading-[1.3] tracking-[-0.01em]">{title}</h3>
                  {badge}
                </div>
                {description && <p className="m-0 mt-1 text-[13px] leading-[1.55] text-[color:var(--color-muted)]">{description}</p>}
              </div>
            )}
            {action && <div className="flex-shrink-0 sm:ml-auto">{action}</div>}
          </div>
        )}
        {children}
      </section>
    );
  }

  return (
    <section className={cn('rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--color-border)] px-6 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className="m-0 text-[15px] font-bold tracking-[-0.005em]">{title}</h2>
            {badge}
          </div>
          {description && <p className="m-0 mt-1 text-[13px] leading-[1.5] text-[color:var(--color-muted)]">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

/**
 * Lo que se toca poco, plegado: el título y, al lado, un resumen de lo que hay dentro.
 * Se usa para textos opcionales que acompañan a una lista o a un horario.
 */
export function Fold({ title, summary, badge, defaultOpen, children }: { title: string; summary?: string; badge?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="editor-fold group overflow-hidden rounded-[10px] border border-[color:var(--color-border)] bg-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-[color:var(--color-surface-2)] [&::-webkit-details-marker]:hidden">
        <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--color-muted)] transition-transform group-open:rotate-90 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5" /></svg>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-[color:var(--color-ink)]">{title}</span>
          {summary && <span className="block truncate text-[13px] text-[color:var(--color-muted)] group-open:hidden">{summary}</span>}
        </span>
        {badge}
      </summary>
      <div className="border-t border-[color:var(--color-border)] p-4 sm:p-5">{children}</div>
    </details>
  );
}
