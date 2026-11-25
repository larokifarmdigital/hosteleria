import { forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] px-4 py-2 text-[14px] font-semibold leading-none transition-[background,border-color,color,box-shadow] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100 sm:min-h-9',
  {
    variants: {
      variant: {
        primary: 'border border-transparent bg-[color:var(--color-accent)] text-white hover:bg-[color:var(--color-accent-hover)]',
        secondary:
          'border border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]',
        ghost:
          'border border-transparent bg-transparent text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]'
      },
      size: {
        default: '',
        sm: 'px-3 text-[13px] sm:min-h-8'
      }
    },
    defaultVariants: { variant: 'secondary', size: 'default' }
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

// `type="button"` por defecto: el de HTML es `submit`, y un botón cualquiera
// dentro de un `<form>` (p. ej. Publicar) enviaría el formulario al pulsarlo.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size, className, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      {...props}
      className={cn(buttonVariants({ variant, size }), className)}
    />
  );
});

type LinkButtonProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>;

export function LinkButton({ variant = 'secondary', size, className, ...props }: LinkButtonProps) {
  return (
    <Link
      {...props}
      className={cn(buttonVariants({ variant, size }), className)}
    />
  );
}
