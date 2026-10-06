import type { Env } from '../env.js';

/**
 * Abstracción de envío de emails.
 *
 * Dos implementaciones:
 *  - **Console** (sin `RESEND_API_KEY`) → loguea en consola. Dev-friendly.
 *  - **Resend** (con `RESEND_API_KEY`) → envía vía resend.com (3k/mes free).
 *
 * Para añadir otro provider (SendGrid/Postmark/etc.): implementar
 * `EmailProvider` y añadir case en `getEmailProvider()`.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<{ id: string }>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput) {
    console.log('\n─── 📧 EMAIL (console provider — RESEND_API_KEY vacío) ───');
    console.log(`  To: ${input.to}`);
    console.log(`  Subject: ${input.subject}`);
    console.log(`  Text:\n${input.text.split('\n').map(l => '    ' + l).join('\n')}`);
    console.log('─────────────────────────────────────────────────────────\n');
    return { id: `console-${Date.now()}` };
  }
}

class ResendEmailProvider implements EmailProvider {
  constructor(private apiKey: string, private from: string) {}

  async send(input: SendEmailInput) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text
      })
    });
    const body = await res.json().catch(() => ({})) as { id?: string; error?: any };
    if (!res.ok) throw new Error(`resend_failed: ${JSON.stringify(body.error ?? body)}`);
    return { id: body.id ?? 'unknown' };
  }
}

let _provider: EmailProvider | null = null;

/**
 * Devuelve el provider configurado (singleton por isolate).
 *
 * Dónde se usa:
 *  - `src/auth/route.ts` → POST /auth/forgot (email de reset).
 *  - `src/users/route.ts` → POST /users (email de bienvenida).
 */
export function getEmailProvider(env: Env): EmailProvider {
  if (_provider) return _provider;
  _provider = env.RESEND_API_KEY
    ? new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM)
    : new ConsoleEmailProvider();
  return _provider;
}
