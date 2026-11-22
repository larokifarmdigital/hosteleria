import { isCronAuthorized } from '@/core/http/cronAuth';
import { runCleanup } from '@/core/http/scheduled/cleanup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Lo que deja el plan Hobby de Vercel sin configurar nada más.
export const maxDuration = 60;

// Horario en `vercel.json`. Vercel Cron llama con GET y `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ code: 'UNAUTHORIZED', message: 'No autorizado.' }, { status: 401 });
  }
  try {
    return Response.json({ ok: true, result: await runCleanup() });
  } catch (err) {
    console.error('[cron:cleanup]', err instanceof Error ? err.message : err);
    return Response.json({ code: 'CRON_FAILED', message: 'La tarea ha fallado.' }, { status: 500 });
  }
}
