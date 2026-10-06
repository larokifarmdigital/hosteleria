# email/

Envío de emails transaccionales (bienvenida al crear user, reset de password).

## Archivos

| Archivo | Qué hace |
|---|---|
| `provider.ts` | Abstracción `EmailProvider` + 2 implementaciones (Console / Resend) + factory `getEmailProvider(env)` |
| `templates.ts` | HTML + text de cada tipo de email (`welcomeTemplate`, `passwordResetTemplate`) |

## Providers

Se elige automáticamente según el env:

- **Sin `RESEND_API_KEY`** → `ConsoleEmailProvider` loguea el email en `console.log`.
  Útil para dev y para testear sin consumir quota.
- **Con `RESEND_API_KEY`** → `ResendEmailProvider` envía de verdad vía
  [resend.com](https://resend.com) (free tier: 3k emails/mes).

## Añadir un nuevo tipo de email

1. En `templates.ts`, crear una función `nombreTemplate(props)` que devuelva
   `{ subject, html, text }`.
2. En el handler que lo envía: `getEmailProvider(env).send({ to, ...nombreTemplate(props) })`.
3. Si es un flow con token (como welcome/reset), ver `src/auth/session-tokens.ts`.

## Añadir un provider nuevo (SendGrid, Postmark, etc.)

1. En `provider.ts`, implementar `class XxxProvider implements EmailProvider`.
2. Añadir el case en `getEmailProvider()` basado en una var env nueva (ej. `SENDGRID_API_KEY`).
