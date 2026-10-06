import type { EmailSender, SendEmailInput } from '../../domain/services/emailSender.js';

/** Default en dev / cuando falta `RESEND_API_KEY`: imprime en consola. */
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
