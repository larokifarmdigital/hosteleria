import type { EmailSender, SendEmailInput } from '../../domain/services/emailSender';
import { getEnv } from '../env';

export class ConsoleEmailSender implements EmailSender {
  async send(input: SendEmailInput): Promise<{ id: string }> {
    // El cuerpo lleva enlaces con token (invitación, cambio de contraseña): fuera de
    // local los logs se guardan, y quien los lea podría entrar con ellos.
    if (getEnv().APP_ENV !== 'development') {
      console.log(`[email] sin RESEND_API_KEY: no se envía «${input.subject}»`);
      return { id: `console-${Date.now()}` };
    }
    console.log('\n─── EMAIL (console sender — RESEND_API_KEY vacío) ───');
    console.log(`  To: ${input.to}`);
    console.log(`  Subject: ${input.subject}`);
    console.log(`  Text:\n${input.text.split('\n').map(l => '    ' + l).join('\n')}`);
    console.log('────────────────────────────────────────\n');
    return { id: `console-${Date.now()}` };
  }
}
