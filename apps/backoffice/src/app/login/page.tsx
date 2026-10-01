import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Panel izq: gradient cobre-deep con blobs radiales */}
      <div
        className="relative flex flex-col justify-between overflow-hidden p-[60px] text-white max-lg:hidden"
        style={{ background: 'var(--gradient-copper-deep)' }}
      >
        <div
          aria-hidden
          className="absolute -right-[120px] -top-[120px] h-[440px] w-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(230,178,148,0.4), transparent 68%)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-[100px] -left-[100px] h-[360px] w-[360px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(197,105,71,0.4), transparent 70%)' }}
        />

        <div className="relative flex items-center gap-3">
          <div
            className="grid h-9 w-9 place-items-center rounded-[10px] text-[14px] font-extrabold text-white"
            style={{
              background: 'var(--gradient-copper)',
              boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.28)'
            }}
          >
            HS
          </div>
          <strong className="text-[16px] font-bold tracking-[-0.01em]">Hosteleria Studio</strong>
        </div>

        <div className="relative max-w-[460px]">
          <h1 className="mb-4 text-[40px] font-bold leading-[1.1] tracking-[-0.025em]">
            El backoffice de tus restaurantes, en un solo sitio.
          </h1>
          <p className="text-[14.5px] leading-[1.65] text-[#cfc9bd]">
            Edita el contenido de las 6 landings de Casabella, Guixot, La Principal, Roure, Pubilla y Ocaña. Tres
            idiomas, un solo login.
          </p>
        </div>

        <div className="relative flex gap-5 text-[12px] text-[#8b8f9c]">
          <span>© 2026 · Grupo Hosteleria</span>
          <span>studio.hosteleria.cat</span>
        </div>
      </div>

      {/* Form derecha */}
      <div className="grid place-items-center p-10">
        <LoginForm />
      </div>
    </div>
  );
}
