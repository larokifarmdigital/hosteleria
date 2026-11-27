import { Children, forwardRef, isValidElement, type ReactNode } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
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

interface SelectOption { value: string; label: ReactNode; disabled?: boolean }
interface SelectGroup { label?: string; options: SelectOption[] }

/** Lee las `<option>` y `<optgroup>` de siempre: así cada pantalla escribe el desplegable como antes. */
function readOptions(children: ReactNode): SelectGroup[] {
  const groups: SelectGroup[] = [];
  let loose: SelectGroup | null = null;
  Children.forEach(children, child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; label?: string; disabled?: boolean }>(child)) return;
    if (child.type === 'optgroup') {
      loose = null;
      groups.push({ label: child.props.label, options: readOptions(child.props.children).flatMap(g => g.options) });
    } else if (child.type === 'option') {
      if (!loose) { loose = { options: [] }; groups.push(loose); }
      loose.options.push({ value: String(child.props.value ?? ''), label: child.props.children, disabled: child.props.disabled });
    }
  });
  return groups;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string;
  /** Como el de un `<select>`: `e.target.value` trae la opción elegida. */
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
}

/**
 * Desplegable propio (Radix), igual en escritorio y en móvil. Se usa como un `<select>`:
 * `value`, `onChange` y sus `<option>` y `<optgroup>`. Con react-hook-form va con
 * `Controller` (no con `register`), para que `reset()` también cambie lo que se ve.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { id, name, value, onChange, onBlur, disabled, required, placeholder, className, children, ...aria },
  ref
) {
  const groups = readOptions(children);
  const item = (option: SelectOption) => (
    <RadixSelect.Item
      key={option.value}
      value={option.value}
      disabled={option.disabled}
      data-value={option.value}
      className="relative flex min-h-11 cursor-pointer select-none items-center rounded-[6px] py-2 pl-8 pr-3 text-[16px] text-[color:var(--color-ink-soft)] outline-none data-[disabled]:cursor-default data-[disabled]:opacity-45 data-[highlighted]:bg-[color:var(--color-surface-2)] data-[highlighted]:text-[color:var(--color-ink)] data-[state=checked]:font-semibold data-[state=checked]:text-[color:var(--color-ink)] sm:min-h-9 sm:text-[14px]"
    >
      <RadixSelect.ItemIndicator className="absolute left-2.5 inline-flex">
        <Check aria-hidden className="h-4 w-4 text-[color:var(--color-accent)]" />
      </RadixSelect.ItemIndicator>
      <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );

  return (
    <RadixSelect.Root
      value={value || undefined}
      onValueChange={next => onChange?.({ target: { value: next, name } })}
      onOpenChange={open => { if (!open) onBlur?.(); }}
      disabled={disabled}
      required={required}
      // Sin `name`: Radix pintaría un <select> nativo escondido (para formularios HTML) que aquí
      // no hace falta (el valor va por `onChange`) y que las auditorías cuentan como control diminuto.
    >
      <RadixSelect.Trigger
        ref={ref}
        id={id}
        {...aria}
        className={cn(FIELD_BASE, 'flex min-h-11 cursor-pointer items-center justify-between gap-2 py-2 text-left disabled:cursor-default disabled:opacity-60 data-[placeholder]:text-[color:var(--color-muted)] sm:min-h-10', className)}
      >
        <span className="min-w-0 flex-1 truncate"><RadixSelect.Value placeholder={placeholder} /></span>
        <RadixSelect.Icon className="flex-shrink-0 text-[color:var(--color-muted)]">
          <ChevronDown aria-hidden className="h-4 w-4" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-[80] max-h-[min(360px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[10px] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-md)]"
        >
          <RadixSelect.ScrollUpButton className="flex h-7 items-center justify-center text-[color:var(--color-muted)]"><ChevronUp aria-hidden className="h-4 w-4" /></RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport className="p-1">
            {groups.map((group, i) => group.label ? (
              <RadixSelect.Group key={`${group.label}-${i}`}>
                <RadixSelect.Label className="px-3 pb-1 pt-2.5 text-[12.5px] font-bold text-[color:var(--color-muted)]">{group.label}</RadixSelect.Label>
                {group.options.map(item)}
              </RadixSelect.Group>
            ) : <div key={`suelto-${i}`}>{group.options.map(item)}</div>)}
          </RadixSelect.Viewport>
          <RadixSelect.ScrollDownButton className="flex h-7 items-center justify-center text-[color:var(--color-muted)]"><ChevronDown aria-hidden className="h-4 w-4" /></RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
});

/** El desplegable unido a un campo de react-hook-form (en lugar de `{...register(name)}`). */
export function FormSelect<T extends FieldValues>({ control, name, ...props }: Omit<SelectProps, 'value' | 'onChange' | 'onBlur' | 'name'> & { control: Control<T>; name: Path<T> }) {
  const { field } = useController({ control, name });
  return (
    <Select
      {...props}
      ref={field.ref}
      name={field.name}
      value={field.value == null ? '' : String(field.value)}
      onChange={e => field.onChange(e.target.value)}
      onBlur={field.onBlur}
    />
  );
}

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
