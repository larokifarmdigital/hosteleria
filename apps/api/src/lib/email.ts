import type { Env } from '../env.js';

/**
 * Email provider abstracto.
 *
 * - En dev sin RESEND_API_KEY → ConsoleProvider (loguea el email).
 * - En prod con RESEND_API_KEY → ResendProvider (envía por https://resend.com).
 *
 * Nuevo provider = implementar `send()` + añadir case en `getEmailProvider()`.
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

export function getEmailProvider(env: Env): EmailProvider {
  if (_provider) return _provider;
  _provider = env.RESEND_API_KEY
    ? new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM)
    : new ConsoleEmailProvider();
  return _provider;
}

// ════════════════════════════════════════════════════════════════
// Plantillas — HTML inline (sin templating para no añadir dep).
// Estilos mínimos para que se vean razonables en Gmail/Apple Mail.
// ════════════════════════════════════════════════════════════════

interface WelcomeTemplateProps {
  name: string;
  setupUrl: string;
  invitedBy: string;
}

export function welcomeTemplate({ name, setupUrl, invitedBy }: WelcomeTemplateProps) {
  const text = `
Hola ${name},

${invitedBy} te ha invitado a Hosteleria Studio, el backoffice del grupo.

Para activar tu cuenta y establecer tu contraseña, abre este enlace:

${setupUrl}

El enlace caduca en 48 horas.

Si no esperabas este email, puedes ignorarlo.

— Hosteleria Studio
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #f7f6f2; margin: 0; padding: 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #eee8e0; border-radius: 14px; overflow: hidden;">
    <tr><td style="padding: 32px 36px;">
      <div style="font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: #6d6862; font-weight: 600; margin-bottom: 20px;">
        Hosteleria Studio
      </div>
      <h1 style="font-size: 22px; font-weight: 700; color: #0a0a0a; margin: 0 0 12px;">Hola ${escapeHtml(name)},</h1>
      <p style="font-size: 15px; line-height: 1.55; color: #26221e; margin: 0 0 12px;">
        <strong>${escapeHtml(invitedBy)}</strong> te ha invitado al backoffice del grupo.
      </p>
      <p style="font-size: 15px; line-height: 1.55; color: #26221e; margin: 0 0 24px;">
        Pulsa el botón para activar tu cuenta y establecer tu contraseña:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr><td style="background: linear-gradient(135deg, #d18a63 0%, #b4593b 100%); border-radius: 999px;">
          <a href="${setupUrl}" style="display: inline-block; padding: 12px 28px; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px;">
            Activar cuenta
          </a>
        </td></tr>
      </table>
      <p style="font-size: 12.5px; line-height: 1.55; color: #6d6862; margin: 24px 0 0;">
        O copia este enlace: <br><a href="${setupUrl}" style="color: #b4593b; word-break: break-all;">${setupUrl}</a>
      </p>
      <p style="font-size: 12.5px; color: #a29d95; margin: 24px 0 0;">
        El enlace caduca en 48 horas. Si no esperabas este email, puedes ignorarlo.
      </p>
    </td></tr>
  </table>
</body>
</html>
`.trim();

  return { subject: `Te han invitado a Hosteleria Studio`, html, text };
}

interface ResetTemplateProps {
  name: string;
  resetUrl: string;
}

export function passwordResetTemplate({ name, resetUrl }: ResetTemplateProps) {
  const text = `
Hola ${name},

Hemos recibido una solicitud de restablecimiento de contraseña para tu cuenta.

Para elegir una nueva contraseña, abre este enlace:

${resetUrl}

El enlace caduca en 1 hora.

Si no has sido tú, ignora este email. Tu contraseña actual sigue siendo válida.

— Hosteleria Studio
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #f7f6f2; margin: 0; padding: 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #eee8e0; border-radius: 14px; overflow: hidden;">
    <tr><td style="padding: 32px 36px;">
      <div style="font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: #6d6862; font-weight: 600; margin-bottom: 20px;">
        Hosteleria Studio
      </div>
      <h1 style="font-size: 22px; font-weight: 700; color: #0a0a0a; margin: 0 0 12px;">Hola ${escapeHtml(name)},</h1>
      <p style="font-size: 15px; line-height: 1.55; color: #26221e; margin: 0 0 24px;">
        Hemos recibido una solicitud para restablecer tu contraseña. Pulsa el botón para elegir una nueva:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr><td style="background: linear-gradient(135deg, #d18a63 0%, #b4593b 100%); border-radius: 999px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 28px; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px;">
            Elegir nueva contraseña
          </a>
        </td></tr>
      </table>
      <p style="font-size: 12.5px; color: #a29d95; margin: 24px 0 0;">
        El enlace caduca en 1 hora. Si no has sido tú, ignora este email — tu contraseña actual sigue siendo válida.
      </p>
    </td></tr>
  </table>
</body>
</html>
`.trim();

  return { subject: 'Restablecer contraseña — Hosteleria Studio', html, text };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
