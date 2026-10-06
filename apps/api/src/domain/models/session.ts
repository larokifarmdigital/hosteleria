/**
 * Entidad `Session` — una sesión Lucia activa.
 *
 * El adapter de infraestructura (`LuciaSessionRepository`) hace de puente
 * con Lucia; dentro del dominio solo nos importa el shape que exponemos
 * al endpoint `GET /auth/sessions` (ver "cerrar sesión en otro dispositivo").
 */

export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly userAgent: string | null;
  readonly ipHash: string | null;    // SHA-256 truncado (GDPR — no IP cruda)
}

/** Metadata que enriquece la sesión tras el login (user agent + hash IP). */
export interface SessionMetadata {
  userAgent: string | null;
  ipHash: string;
}

// ─── Domain errors ───────────────────────────────────────────────
export class SessionNotFoundError extends Error {
  constructor(id: string) { super(`session_not_found:${id}`); this.name = 'SessionNotFoundError'; }
}
