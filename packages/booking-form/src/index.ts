export { bookingStrings } from './i18n.ts';

export type BookingStrings = {
  pickDate: string;
  pickTime: string;
  prev: string;
  next: string;
  closed: string;
  selectDateFirst: string;
  monthNames: string[];
  dayShort: string[];
  errPhone: string;
  errEmail: string;
  errGuests: string;
  errDate: string;
  errTime: string;
};

export type BookingConfig = {
  /** Índice = getDay() (0=Dom … 6=Sáb). Cada valor es una lista de turnos [open,close] en decimal. */
  hoursByDay: number[][][];
  strings: BookingStrings;
  bookingEmail: string;
  restaurantName: string;
  /** Clases utility (Tailwind) que la app quiera aplicar al día seleccionado. */
  classSelectedDay?: string;
  /** Clases utility para el slot de hora seleccionado. */
  classSelectedSlot?: string;
};

const DEFAULT_SELECTED_DAY = 'bg-accent text-bg font-semibold';
const DEFAULT_SELECTED_SLOT = 'bg-accent text-bg border-accent font-semibold';

export const validSpanishPhone = (raw: string) =>
  /^(\+34)?[6789]\d{8}$/.test((raw || '').replace(/\s/g, ''));

export const validEmail = (raw: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((raw || '').trim());

export const validGuests = (raw: string) => {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 20;
};

const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const decimalToHHMM = (dec: number) => {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Hidrata el form de reserva. Busca `#reservaForm` en el DOM y lee su config
 * desde `<script type="application/json" id="bookingConfig">` inyectado por
 * la app en el mismo scope.
 */
export function initBookingForm(): void {
  const form = document.getElementById('reservaForm') as HTMLFormElement | null;
  if (!form) return;
  const configEl = document.getElementById('bookingConfig');
  if (!configEl) return;
  const config = JSON.parse(configEl.textContent || '{}') as BookingConfig;
  const { hoursByDay, strings: tt, bookingEmail, restaurantName } = config;
  const classSelectedDay = config.classSelectedDay ?? DEFAULT_SELECTED_DAY;
  const classSelectedSlot = config.classSelectedSlot ?? DEFAULT_SELECTED_SLOT;

  const msgEl = document.getElementById('reservaMsg');

  const showError = (name: string, msg: string) => {
    const errEl = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (!errEl) return;
    if (msg) {
      errEl.textContent = msg;
      errEl.setAttribute('data-error', '');
    } else {
      errEl.textContent = '';
      errEl.removeAttribute('data-error');
    }
  };

  const phoneEl = form.querySelector<HTMLInputElement>('[data-input-phone]');
  if (phoneEl) {
    phoneEl.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      let v = target.value.replace(/[^\d+ ]/g, '');
      v = v.replace(/(?!^)\+/g, '');
      target.value = v;
      if (validSpanishPhone(v)) showError('telefono', '');
    });
    phoneEl.addEventListener('blur', () => {
      const v = phoneEl.value.trim();
      showError('telefono', v && !validSpanishPhone(v) ? tt.errPhone : '');
    });
  }

  const emailEl = form.querySelector<HTMLInputElement>('[data-input-email]');
  if (emailEl) {
    emailEl.addEventListener('blur', () => {
      const v = emailEl.value.trim();
      showError('email', v && !validEmail(v) ? tt.errEmail : '');
    });
    emailEl.addEventListener('input', () => {
      if (validEmail(emailEl.value)) showError('email', '');
    });
  }

  const guestsEl = form.querySelector<HTMLInputElement>('[data-input-guests]');
  if (guestsEl) {
    guestsEl.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      let v = target.value.replace(/\D/g, '');
      if (v.length > 2) v = v.slice(0, 2);
      if (parseInt(v, 10) > 20) v = '20';
      target.value = v;
      if (validGuests(v)) showError('personas', '');
    });
    guestsEl.addEventListener('blur', () => {
      showError('personas', guestsEl.value && !validGuests(guestsEl.value) ? tt.errGuests : '');
    });
  }

  const closeAllPopovers = () => {
    document
      .querySelectorAll('[data-datepicker-pop], [data-timepicker-pop]')
      .forEach((p) => p.classList.add('hidden'));
  };
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (
      !target.closest(
        '[data-datepicker-btn], [data-datepicker-pop], [data-timepicker-btn], [data-timepicker-pop]'
      )
    ) {
      closeAllPopovers();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPopovers();
  });

  const dateBtn = form.querySelector<HTMLButtonElement>('[data-datepicker-btn]');
  const dateLabel = form.querySelector<HTMLElement>('[data-datepicker-label]');
  const dateInput = form.querySelector<HTMLInputElement>('[data-datepicker-input]');
  const datePop = form.querySelector<HTMLElement>('[data-datepicker-pop]');

  let dpMonth = new Date().getMonth();
  let dpYear = new Date().getFullYear();
  let dpSelected: string | null = null;
  let tpSelected: string | null = null;

  const formatHumanDate = (iso: string) => {
    const d = parseISO(iso);
    const weekday = tt.dayShort[(d.getDay() + 6) % 7];
    return `${weekday} ${d.getDate()} ${tt.monthNames[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
  };

  const renderCalendar = () => {
    if (!datePop) return;
    const first = new Date(dpYear, dpMonth, 1);
    const daysInMonth = new Date(dpYear, dpMonth + 1, 0).getDate();
    const startOffset = (first.getDay() + 6) % 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekHead = tt.dayShort
      .map(
        (d) =>
          `<div class="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-dim py-1.5">${d}</div>`
      )
      .join('');

    let cells = '';
    for (let i = 0; i < startOffset; i++) cells += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(dpYear, dpMonth, d);
      const iso = isoDate(cellDate);
      const dayOfWeek = cellDate.getDay();
      const isPast = cellDate < today;
      const isClosed = !hoursByDay[dayOfWeek] || hoursByDay[dayOfWeek].length === 0;
      const isDisabled = isPast || isClosed;
      const isSelected = dpSelected === iso;
      const isToday = iso === isoDate(today);

      const classes = [
        'w-9 h-9 flex items-center justify-center text-[13px] font-sans tabular-nums rounded transition-colors',
        isDisabled
          ? 'text-dim/50 cursor-not-allowed line-through decoration-line/60'
          : 'text-ink hover:bg-accent hover:text-bg cursor-pointer',
        isSelected && !isDisabled ? classSelectedDay : '',
        isToday && !isSelected ? 'ring-1 ring-accent/60' : ''
      ]
        .filter(Boolean)
        .join(' ');

      cells += `<button type="button" class="${classes}" ${isDisabled ? 'disabled' : `data-day="${iso}"`}>${d}</button>`;
    }

    datePop.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <button type="button" data-dp-prev aria-label="${tt.prev}" class="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-accent hover:bg-line/40 cursor-pointer transition-colors">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M12 15l-5-5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="font-serif text-[15px] font-medium tracking-tight text-ink">${tt.monthNames[dpMonth]} ${dpYear}</div>
        <button type="button" data-dp-next aria-label="${tt.next}" class="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-accent hover:bg-line/40 cursor-pointer transition-colors">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M8 5l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="grid grid-cols-7 gap-1 mb-1">${weekHead}</div>
      <div class="grid grid-cols-7 gap-1">${cells}</div>
    `;

    datePop.querySelector('[data-dp-prev]')?.addEventListener('click', () => {
      dpMonth--;
      if (dpMonth < 0) {
        dpMonth = 11;
        dpYear--;
      }
      renderCalendar();
    });
    datePop.querySelector('[data-dp-next]')?.addEventListener('click', () => {
      dpMonth++;
      if (dpMonth > 11) {
        dpMonth = 0;
        dpYear++;
      }
      renderCalendar();
    });
    datePop.querySelectorAll<HTMLButtonElement>('[data-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const iso = btn.getAttribute('data-day') || '';
        dpSelected = iso;
        if (dateInput) dateInput.value = iso;
        if (dateLabel) {
          dateLabel.textContent = formatHumanDate(iso);
          dateLabel.classList.remove('text-dim', 'italic');
          dateLabel.classList.add('text-ink');
        }
        showError('fecha', '');
        tpSelected = null;
        if (timeInput) timeInput.value = '';
        if (timeLabel) {
          timeLabel.textContent = tt.pickTime;
          timeLabel.classList.add('text-dim', 'italic');
          timeLabel.classList.remove('text-ink');
        }
        datePop.classList.add('hidden');
      });
    });
  };

  dateBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!datePop) return;
    const isOpen = !datePop.classList.contains('hidden');
    closeAllPopovers();
    if (!isOpen) {
      renderCalendar();
      datePop.classList.remove('hidden');
    }
  });

  const timeBtn = form.querySelector<HTMLButtonElement>('[data-timepicker-btn]');
  const timeLabel = form.querySelector<HTMLElement>('[data-timepicker-label]');
  const timeInput = form.querySelector<HTMLInputElement>('[data-timepicker-input]');
  const timePop = form.querySelector<HTMLElement>('[data-timepicker-pop]');

  const renderTimeSlots = () => {
    if (!timePop) return;
    if (!dpSelected) {
      timePop.innerHTML = `<div class="text-center text-muted italic text-[13px] py-6">${tt.selectDateFirst}</div>`;
      return;
    }
    const d = parseISO(dpSelected);
    const dayOfWeek = d.getDay();
    const turnos = hoursByDay[dayOfWeek] || [];
    if (!turnos.length) {
      timePop.innerHTML = `<div class="text-center text-muted italic text-[13px] py-6">${tt.closed}</div>`;
      return;
    }

    const html = turnos
      .map(([open, close]) => {
        const slots: string[] = [];
        for (let h = open; h + 0.5 <= close; h += 0.25) {
          slots.push(decimalToHHMM(h));
        }
        const buttons = slots
          .map((s) => {
            const isSel = tpSelected === s;
            const cls = [
              'py-2 px-2 text-[13px] font-sans tabular-nums rounded border transition-colors',
              isSel
                ? classSelectedSlot
                : 'text-ink border-line hover:border-accent hover:bg-accent hover:text-bg cursor-pointer'
            ].join(' ');
            return `<button type="button" class="${cls}" data-slot="${s}">${s}</button>`;
          })
          .join('');
        const rangeLabel = `${decimalToHHMM(open)}–${decimalToHHMM(close)}`;
        return `
          <div class="mb-3 last:mb-0">
            <div class="text-[10px] uppercase tracking-[0.18em] text-dim font-semibold mb-2">${rangeLabel}</div>
            <div class="grid grid-cols-4 gap-1.5">${buttons}</div>
          </div>
        `;
      })
      .join('');

    timePop.innerHTML = html;
    timePop.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = btn.getAttribute('data-slot') || '';
        tpSelected = s;
        if (timeInput) timeInput.value = s;
        if (timeLabel) {
          timeLabel.textContent = s;
          timeLabel.classList.remove('text-dim', 'italic');
          timeLabel.classList.add('text-ink');
        }
        showError('hora', '');
        timePop.classList.add('hidden');
      });
    });
  };

  timeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!timePop) return;
    const isOpen = !timePop.classList.contains('hidden');
    closeAllPopovers();
    if (!isOpen) {
      renderTimeSlots();
      timePop.classList.remove('hidden');
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    const nameEl = form.querySelector<HTMLInputElement>('input[name="nombre"]');
    if (!nameEl || !nameEl.value.trim()) ok = false;
    if (phoneEl && !validSpanishPhone(phoneEl.value)) {
      showError('telefono', tt.errPhone);
      ok = false;
    }
    if (emailEl && emailEl.value.trim() && !validEmail(emailEl.value)) {
      showError('email', tt.errEmail);
      ok = false;
    }
    if (guestsEl && !validGuests(guestsEl.value)) {
      showError('personas', tt.errGuests);
      ok = false;
    }
    if (dateInput && !dateInput.value) {
      showError('fecha', tt.errDate);
      ok = false;
    }
    if (timeInput && !timeInput.value) {
      showError('hora', tt.errTime);
      ok = false;
    }
    if (!ok) return;

    const d = new FormData(form);
    const nombre = d.get('nombre'),
      telefono = d.get('telefono'),
      email = d.get('email') || '(no indicado)',
      personas = d.get('personas'),
      fecha = d.get('fecha'),
      hora = d.get('hora'),
      notas = d.get('notas') || '(sin notas)';
    const subject = `Reserva: ${nombre} — ${personas} pax — ${fecha} ${hora}`;
    const body = `Solicitud de reserva en ${restaurantName}

Nombre: ${nombre}
Teléfono: ${telefono}
Email: ${email}
Comensales: ${personas}
Fecha: ${fecha}
Hora: ${hora}
Notas: ${notas}`;
    window.location.href =
      'mailto:' +
      bookingEmail +
      '?subject=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(body);
    if (msgEl) msgEl.textContent = '…';
  });
}
