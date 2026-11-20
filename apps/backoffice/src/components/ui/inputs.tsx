import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// 16px de fuente: por debajo, iOS hace zoom al enfocar el campo.
const BASE =
  'w-full rounded-[10px] border border-[color:var(--color-border-strong)] bg-white px-3.5 text-[16px] leading-[1.4] text-[color:var(--color-ink)] transition-colors placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)] aria-[invalid=true]:border-[color:var(--color-danger)]';

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, type = 'text', ...props }, ref) {
    return <input ref={ref} type={type} {...props} className={cn(BASE, 'min-h-11 py-2.5', className)} />;
  }
);

export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} {...props} className={cn(BASE, 'resize-y py-2.5 leading-[1.55]', className)} />;
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
