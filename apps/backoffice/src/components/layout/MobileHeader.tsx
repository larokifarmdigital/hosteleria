'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

/**
 * En <900px la sidebar desaparece. Este header muestra un burger que abre
 * un drawer fixed con la misma Sidebar dentro. Cierra al navegar.
 */
export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('overlay-open', open);
    return () => document.body.classList.remove('overlay-open');
  }, [open]);

  return (
    <>
      <div
        className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[color:var(--color-border)] bg-white px-4 lg:hidden"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-8 w-8 place-items-center rounded-[10px] text-[13px] font-extrabold text-white"
            style={{ background: 'var(--gradient-copper)' }}
          >
            HS
          </div>
          <strong className="text-[14px] font-bold">Hosteleria Studio</strong>
        </div>
        <button
          type="button"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen(v => !v)}
          className="grid h-9 w-9 place-items-center rounded-[10px] border border-[color:var(--color-border)] text-[color:var(--color-ink)]"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar />
          </div>
        </>
      )}
    </>
  );
}
