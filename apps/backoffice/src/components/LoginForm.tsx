'use client';

import { useActionState } from 'react';
import { loginAction } from '@/lib/actions';

const INPUT =
  'w-full rounded-[10px] border border-[color:var(--color-border-strong)] bg-white px-3.5 py-3 text-[16px] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)]';

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, { error: null as string | null });

  return (
    <form className="w-full max-w-[360px]" action={formAction} aria-describedby={state.error ? 'lg-error' : undefined}>
      <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">Iniciar sesión</h1>
      <p className="mb-7 text-[13.5px] text-[color:var(--color-muted)]">Accede con tu email del equipo.</p>

      <input type="hidden" name="next" value={next} />

      <div className="mb-4">
        <label htmlFor="lg-email" className="mb-2 block cursor-pointer text-[13px] font-semibold">Email</label>
        <input id="lg-email" name="email" type="email" autoComplete="username" required className={INPUT} />
      </div>
      <div className="mb-5">
        <label htmlFor="lg-pwd" className="mb-2 block cursor-pointer text-[13px] font-semibold">Contraseña</label>
        <input id="lg-pwd" name="password" type="password" autoComplete="current-password" required className={INPUT} />
      </div>

      <p
        id="lg-error"
        role="alert"
        className={
          state.error
            ? 'mb-4 rounded-[10px] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger-soft)] px-3 py-2 text-[13px] font-medium text-[color:var(--color-danger)]'
            : 'sr-only'
        }
      >
        {state.error}
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background: 'var(--gradient-copper)',
          boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgb(255 255 255 / 0.2)'
        }}
      >
        {isPending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
