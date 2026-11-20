interface Props {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: Props) {
  return (
    <div className="mb-8">
      <h1 className="m-0 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">{title}</h1>
      {children && <p className="mt-2 text-[14px] leading-[1.5] text-[color:var(--color-muted)]">{children}</p>}
    </div>
  );
}
