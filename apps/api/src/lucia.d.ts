// Sin imports a propósito: evita ciclos de resolución.
import 'lucia';

declare module 'lucia' {
  interface Register {
    Lucia: import('lucia').Lucia<Record<string, never>, DatabaseUserAttributes>;
    DatabaseUserAttributes: {
      email: string;
      name: string;
      role: 'admin' | 'editor';
      avatarColor: string;
    };
  }
  interface DatabaseUserAttributes {
    email: string;
    name: string;
    role: 'admin' | 'editor';
    avatarColor: string;
  }
}
