import { handle } from 'hono/vercel';
import { apiApp } from '@/core/http/nextApp';

// Node y no Edge: el pool de Neon vive en el proceso y los ETag se firman con `node:crypto`.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = handle(apiApp);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
