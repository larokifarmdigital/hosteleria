import type { EmailSender, SendEmailInput } from '../../domain/services/emailSender.js';

/**
 * Impl del `EmailSender` que loguea en consola — sin consumir quota del
 * provider. Default en dev (y cuando no hay `RESEND_API_KEY`).
 */
export class ConsoleEmailSender implements EmailSender {
  async send(input: SendEmailInput): Promise<{ id: string }> {
    console.log('\n─── 📧 EMAIL (console sender — RESEND_API_KEY vacío) ───');
    console.log(`  To: ${input.to}`);
    console.log(`  Subject: ${input.subject}`);
    console.log(`  Text:\n${input.text.split('\n').map(l => '    ' + l).join('\n')}`);
    console.log('─────────────────────────────────────────────────────────\n');
    return { id: `console-${Date.now()}` };
  }
}
