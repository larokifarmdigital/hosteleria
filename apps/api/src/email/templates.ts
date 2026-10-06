/**
 * Plantillas HTML + text para los emails transaccionales.
 *
 * HTML inline (sin templating engine). Estilos simples para que se vean
 * bien en Gmail / Apple Mail / Outlook sin romperse.
 *
 * Cada template devuelve `{ subject, html, text }` listo para pasarle
 * a `provider.send()`.
 */

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

interface WelcomeTemplateProps {
  name: string;
  setupUrl: string;
  invitedBy: string;
}

/**
 * Email de bienvenida — link para elegir password inicial (válido 48h).
 *
 * Dónde se usa: `src/users/route.ts` → POST /users.
 */
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

/**
 * Email de reset de password — link para elegir una nueva (válido 1h).
 *
 * Dónde se usa: `src/auth/route.ts` → POST /auth/forgot.
 */
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
