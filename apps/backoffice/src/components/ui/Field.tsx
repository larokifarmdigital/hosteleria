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
  required?: boolean;
  /** Contador «usados / máximo». */
  count?: { value: number; max: number };
  className?: string;
  children: (control: FieldControlProps) => React.ReactNode;
}

/** Enlaza etiqueta, ayuda y error con el control por `id`, para que un lector de pantalla los lea juntos. */
export function Field({ id, label, labelSuffix, hint, error, required, count, className, children }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const over = count ? count.value > count.max : false;

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="cursor-pointer text-[13.5px] font-semibold text-[color:var(--color-ink)]">
          {label}
          {labelSuffix && <span className="sr-only"> ({labelSuffix})</span>}
          {required && <span className="font-normal text-[color:var(--color-muted)]"> (obligatorio)</span>}
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
      {hint && (
        <p id={hintId} className="m-0 mt-1.5 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="m-0 mt-1.5 text-[13px] font-medium text-[color:var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
