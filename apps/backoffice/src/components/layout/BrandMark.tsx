export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 border-b border-[color:var(--color-nav-border)] px-5 py-5">
      <div
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-[10px] text-[13px] font-extrabold tracking-[-0.02em] text-white"
        style={{
          background: 'var(--gradient-copper)',
          boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.28), 0 2px 4px rgb(10 10 10 / 0.35)'
        }}
      >
        HS
      </div>
      <strong className="text-[14px] font-bold tracking-[-0.01em] text-[color:var(--color-nav-fg-active)]">
        Hosteleria Studio
      </strong>
    </div>
  );
}
