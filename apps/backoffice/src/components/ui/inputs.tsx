import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// 16px en móvil: por debajo, iOS hace zoom al enfocar el campo.
// `focus-within` además de `focus`: en un `type="time"` el botón del reloj es
// un control interno, y al enfocarlo el input deja de cumplir `:focus`.
export const FIELD_BASE =
  'w-full rounded-[8px] border border-[color:var(--color-control)] bg-white px-3 text-[16px] leading-[1.45] text-[color:var(--color-ink)] transition-[border-color,box-shadow] placeholder:text-[color:var(--color-muted)] hover:border-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)] focus-within:border-[color:var(--color-accent)] focus-within:ring-[3px] focus-within:ring-[color:var(--accent-ring)] aria-[invalid=true]:border-[color:var(--color-danger)] sm:text-[14px]';

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, type = 'text', ...props }, ref) {
    return <input ref={ref} type={type} {...props} className={cn(FIELD_BASE, 'min-h-11 py-2 sm:min-h-10', className)} />;
  }
);

export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} {...props} className={cn(FIELD_BASE, 'resize-y py-2.5 leading-[1.55]', className)} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} {...props} className={cn(FIELD_BASE, 'min-h-11 cursor-pointer py-2 sm:min-h-10', className)}>
        {children}
      </select>
    );
  }
);

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, hint, id, className, ...props }, ref) {
    return (
      <label htmlFor={id} className={cn('flex min-h-11 cursor-pointer items-start gap-3 py-2', className)}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          {...props}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="h-6 w-6 flex-shrink-0 cursor-pointer"
          style={{ accentColor: 'var(--color-accent)' }}
        />
        <span>
          <span className="block text-[14px] font-semibold text-[color:var(--color-ink)]">{label}</span>
          {hint && (
            <span id={`${id}-hint`} className="block text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">
              {hint}
            </span>
          )}
        </span>
      </label>
    );
  }
);

/**
 * Interruptor con su texto a la izquierda: para un sí/no que cambia lo que sale en la web.
 * Es un checkbox nativo con `role="switch"`: se registra en el formulario como cualquier otro.
 */
export const SwitchRow = forwardRef<HTMLInputElement, CheckboxProps>(
  function SwitchRow({ label, hint, id, className, ...props }, ref) {
    return (
      <label htmlFor={id} className={cn('flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-[10px] border border-[color:var(--color-border)] bg-white px-4 py-3', className)}>
        <span className="min-w-0">
          <span id={`${id}-label`} className="block text-[14px] font-semibold text-[color:var(--color-ink)]">{label}</span>
          {hint && <span id={`${id}-hint`} className="mt-0.5 block text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">{hint}</span>}
        </span>
        <input ref={ref} id={id} type="checkbox" role="switch" {...props} aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined} className={SWITCH_INPUT} />
      </label>
    );
  }
);

/** Aspecto de interruptor para un `<input type="checkbox">`. */
export const SWITCH_INPUT =
  "relative h-6 w-[42px] flex-shrink-0 cursor-pointer appearance-none rounded-full bg-[color:var(--color-control)] transition-colors before:absolute before:left-[3px] before:top-[3px] before:h-[18px] before:w-[18px] before:rounded-full before:bg-white before:shadow-[0_1px_2px_rgb(0_0_0/0.25)] before:transition-transform before:content-[''] checked:bg-[color:var(--color-accent)] checked:before:translate-x-[18px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] motion-reduce:transition-none motion-reduce:before:transition-none";
