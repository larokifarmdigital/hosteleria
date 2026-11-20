import type { SessionUser } from '@hosteleria/api-client';

const ROLE_LABEL: Record<SessionUser['role'], string> = { admin: 'Administrador', editor: 'Editor' };

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('');
}

export function UserPill({ user }: { user: SessionUser }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-[color:var(--color-nav-border)] px-3 py-3.5">
      <div
        aria-hidden
        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[12.5px] font-bold text-white"
        style={{ background: user.avatarColor }}
      >
        {initialsOf(user.name)}
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <strong className="truncate text-[13px] font-semibold text-[color:var(--color-nav-fg-active)]">
          {user.name}
        </strong>
        <span className="text-[11.5px] text-[color:var(--color-nav-dim)]">{ROLE_LABEL[user.role]}</span>
      </div>
    </div>
  );
}
