import { LinkButton } from '@/components/shared/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[520px] py-16 text-center">
      <h1 className="m-0 text-[22px] font-bold tracking-[-0.015em]">No encontramos esta página</h1>
      <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
        Puede que el enlace esté mal o que no tengas acceso a este restaurante.
      </p>
      <div className="mt-6 flex justify-center">
        <LinkButton href="/" variant="primary">Volver al inicio</LinkButton>
      </div>
    </div>
  );
}
