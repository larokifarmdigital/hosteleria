export function UserPill() {
  return (
    <div className="mt-auto flex items-center gap-2.5 border-t border-[color:var(--color-nav-border)] px-3 py-3.5">
      <div
        className="grid h-8 w-8 place-items-center rounded-full text-[12.5px] font-bold text-white"
        style={{ background: 'var(--color-accent)' }}
      >
        EP
      </div>
      <div className="flex flex-col leading-tight">
        <strong className="text-[13px] font-semibold text-[color:var(--color-nav-fg-active)]">
          Erick Pineda
        </strong>
        <span className="text-[11.5px] text-[color:var(--color-dim)]">Admin</span>
      </div>
    </div>
  );
}
