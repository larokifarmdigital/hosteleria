import Link from 'next/link';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex min-h-[40px] items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold leading-none transition-[background,border-color,color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'border border-transparent text-white hover:-translate-y-px',
        secondary:
          'border border-[color:var(--color-border)] bg-white text-[color:var(--color-ink)] hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-2)]',
        ghost:
          'border border-transparent bg-transparent text-[color:var(--color-muted)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)]'
      },
      size: {
        default: '',
        sm: 'min-h-[32px] px-3.5 py-1.5 text-[12.5px]'
      }
    },
    defaultVariants: { variant: 'secondary', size: 'default' }
  }
);

const primaryStyle: React.CSSProperties = {
  background: 'var(--gradient-copper)',
  boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgb(255 255 255 / 0.2)'
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ variant = 'secondary', size, className, style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={variant === 'primary' ? { ...primaryStyle, ...style } : style}
      className={cn(buttonVariants({ variant, size }), className)}
    />
  );
}

type LinkButtonProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>;

export function LinkButton({ variant = 'secondary', size, className, style, ...props }: LinkButtonProps) {
  return (
    <Link
      {...props}
      style={variant === 'primary' ? { ...primaryStyle, ...style } : style}
      className={cn(buttonVariants({ variant, size }), className)}
    />
  );
}
