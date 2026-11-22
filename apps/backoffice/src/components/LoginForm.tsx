'use client';

import { useActionState, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { loginAction } from '@/lib/actions';

const INPUT =
  'w-full rounded-[10px] border border-[color:var(--color-border-strong)] bg-white px-3.5 py-3 text-[16px] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)]';

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, { error: null as string | null, email: '' as string | undefined });

  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="w-full max-w-[360px]" action={formAction} aria-describedby={state.error ? 'lg-error' : undefined}>
      <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">Iniciar sesión</h1>
      <p className="mb-7 text-[14px] leading-[1.55] text-[color:var(--color-muted)]">Entra para editar la web de tu restaurante.</p>

      <input type="hidden" name="next" value={next} />

      <div className="mb-4">
        <label htmlFor="lg-email" className="mb-2 block cursor-pointer text-[13px] font-semibold">Correo electrónico</label>
        <input id="lg-email" name="email" type="email" autoComplete="username" required defaultValue={state.email ?? ''} className={INPUT} />
      </div>
      <div className="mb-5">
        <label htmlFor="lg-pwd" className="mb-2 block cursor-pointer text-[13px] font-semibold">Contraseña</label>
        <div className="relative">
          <input id="lg-pwd" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className={`${INPUT} pr-12`} />
          <button
            type="button"
            aria-label={showPassword ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-[8px] border-0 bg-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-accent)]"
          >
            {showPassword ? <EyeOff aria-hidden className="h-[18px] w-[18px]" /> : <Eye aria-hidden className="h-[18px] w-[18px]" />}
          </button>
        </div>
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

      <p className="m-0 mt-6 text-[13px] leading-[1.55] text-[color:var(--color-muted)]">
        ¿No recuerdas la contraseña? Pídele a un administrador un enlace para elegir una nueva.
      </p>
    </form>
  );
}
