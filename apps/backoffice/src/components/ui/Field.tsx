import { cn } from '@/lib/utils';

export interface FieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

interface Props {
  id: string;
  label: string;
  /** Texto solo para lectores de pantalla tras la etiqueta, p. ej. el idioma del campo. */
  labelSuffix?: string;
  hint?: string;
  error?: string;
  /** Aviso que no impide guardar, p. ej. una traducción pendiente. */
  warning?: string;
  /** Id de otro elemento que también describe el control. */
  describedBy?: string;
  required?: boolean;
  /** Contador «usados / máximo». */
  count?: { value: number; max: number };
  /** Justo debajo del control, antes de la ayuda: p. ej. el texto original al traducir. */
  below?: React.ReactNode;
  className?: string;
  children: (control: FieldControlProps) => React.ReactNode;
}

/** Enlaza etiqueta, ayuda y error con el control por `id`, para que un lector de pantalla los lea juntos. */
export function Field({ id, label, labelSuffix, hint, error, warning, describedBy: extraDescribedBy, required, count, below, className, children }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const warningId = warning ? `${id}-warning` : undefined;
  const describedBy = [extraDescribedBy, hintId, warningId, errorId].filter(Boolean).join(' ') || undefined;
  const over = count ? count.value > count.max : false;

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="cursor-pointer text-[13.5px] font-medium leading-[1.35] text-[color:var(--color-ink-soft)]">
          {label}
          {labelSuffix && <span className="sr-only"> ({labelSuffix})</span>}
          {required && (
            <>
              <span aria-hidden className="ml-1 font-bold text-[color:var(--color-danger)]">*</span>
              <span className="sr-only">, obligatorio</span>
            </>
          )}
        </label>
        {count && (
          <span
            aria-hidden
            className={cn('tabular text-[12px]', over ? 'font-semibold text-[color:var(--color-danger)]' : 'text-[color:var(--color-muted)]')}
          >
            {count.value}/{count.max}
          </span>
        )}
      </div>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {below}
      {hint && (
        <p id={hintId} className="m-0 mt-1.5 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">
          {hint}
        </p>
      )}
      {warning && (
        <p id={warningId} className="m-0 mt-1.5 flex items-start gap-1.5 text-[13px] font-medium leading-[1.45] text-[color:var(--color-warn-fg)]">
          <span aria-hidden className="mt-[5px] inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
          {warning}
        </p>
      )}
      {error && (
        <p id={errorId} className="m-0 mt-1.5 text-[12.5px] font-medium leading-[1.4] text-[color:var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
