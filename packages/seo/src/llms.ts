import type { APIRoute } from 'astro';
import { t } from '@hosteleria/i18n-utils';
import type { RestaurantData } from '@hosteleria/sanity-client';

const DIAS_ES: Record<string, string> = {
  Mo: 'Lunes',
  Tu: 'Martes',
  We: 'Miércoles',
  Th: 'Jueves',
  Fr: 'Viernes',
  Sa: 'Sábado',
  Su: 'Domingo'
};

const SERVICIO_LABELS: Record<string, string> = {
  terraza: 'Terraza',
  grupos: 'Grupos y eventos',
  sala_privada: 'Sala privada / reservado',
  vegetariano: 'Opciones vegetarianas',
  vegano: 'Opciones veganas',
  sin_gluten: 'Opciones sin gluten',
  menu_dia: 'Menú del día',
  menu_degustacion: 'Menú degustación',
  carta_vinos: 'Carta de vinos amplia',
  bar: 'Bar / vermuteo',
  familiar: 'Familiar / niños',
  pet_friendly: 'Pet friendly',
  accesible: 'Accesible en silla de ruedas',
  aparcamiento: 'Aparcamiento cercano'
};

const PAGO_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  contactless: 'Contactless',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  bizum: 'Bizum'
};

export type CreateLlmsOpts = {
  fetchRestaurantData: () => Promise<RestaurantData>;
};

/**
 * llms.txt — estándar emergente que los LLMs (ChatGPT, Perplexity, Claude, Gemini)
 * consumen preferentemente. Markdown limpio con hechos clave del sitio.
 * https://llmstxt.org
 */
export function createLlmsGET({ fetchRestaurantData }: CreateLlmsOpts): APIRoute {
  return async () => {
    const { restaurant, dishCategories, dishes, wineCategories, wines } =
      await fetchRestaurantData();
    const defaultLocale = restaurant.idiomaPorDefecto?.codigo ?? 'es';
    const dir = restaurant.direccion ?? {};
    const contacto = restaurant.contacto ?? {};
    const redes = restaurant.redes ?? {};
    const url = restaurant.dominio ?? '';

    const nombre = restaurant.nombre;
    const resumen =
      t(restaurant.resumenIA, defaultLocale, defaultLocale) ||
      t(restaurant.seoDescripcion, defaultLocale, defaultLocale) ||
      '';

    const horarios = (restaurant.horariosSemana ?? [])
      .map((d) => {
        const dia = DIAS_ES[d.dia] ?? d.dia;
        const turnos = (d.turnos ?? []).map((tu) => `${tu.apertura}–${tu.cierre}`).join(', ');
        return `- **${dia}**: ${turnos || 'Cerrado'}`;
      })
      .join('\n');

    const servicios = (restaurant.serviciosExtras ?? []).map((s) => SERVICIO_LABELS[s] ?? s);
    const pagos = (restaurant.formasPago ?? []).map((p) => PAGO_LABELS[p] ?? p);

    const dishesBlock = dishCategories
      .map((cat) => {
        const nombreCat = t(cat.nombre, defaultLocale, defaultLocale);
        const items = dishes
          .filter((p) => p.categoria?._id === cat._id)
          .map((p) => {
            const nom = t(p.nombre, defaultLocale, defaultLocale);
            const nota = t(p.nota, defaultLocale, defaultLocale);
            const precio = p.precio != null ? ` — ${p.precio} €` : '';
            return `- **${nom}**${precio}${nota ? `. ${nota}.` : ''}`;
          })
          .join('\n');
        return items ? `### ${nombreCat}\n\n${items}` : null;
      })
      .filter(Boolean)
      .join('\n\n');

    const winesBlock = wineCategories
      .map((cat) => {
        const nombreCat = t(cat.nombre, defaultLocale, defaultLocale);
        const items = wines
          .filter((v) => v.categoria?._id === cat._id)
          .map((v) => {
            const region = v.region ? ` (${v.region})` : '';
            const precio =
              v.precioCopa && v.precioBotella
                ? ` — ${v.precioCopa}€/copa, ${v.precioBotella}€/botella`
                : '';
            return `- ${v.nombre}${region}${precio}`;
          })
          .join('\n');
        return items ? `### ${nombreCat}\n\n${items}` : null;
      })
      .filter(Boolean)
      .join('\n\n');

    const faqBlock = (restaurant.faq ?? [])
      .map((item) => {
        const q = t(item.pregunta, defaultLocale, defaultLocale);
        const a = t(item.respuesta, defaultLocale, defaultLocale);
        return q && a ? `### ${q}\n\n${a}` : null;
      })
      .filter(Boolean)
      .join('\n\n');

    const body = `# ${nombre}

> ${resumen}

## Datos clave

- **Nombre**: ${nombre}
- **Dirección**: ${[dir.calle, `${dir.codigoPostal ?? ''} ${dir.ciudad ?? ''}`.trim(), dir.barrio ? `(${dir.barrio})` : '', dir.pais].filter(Boolean).join(', ')}
${contacto.telefono ? `- **Teléfono**: ${contacto.telefono}\n` : ''}${contacto.whatsapp ? `- **WhatsApp**: ${contacto.whatsapp}\n` : ''}${contacto.email ? `- **Email**: ${contacto.email}\n` : ''}${restaurant.mostrarRedes && redes.instagram ? `- **Instagram**: ${redes.instagram}\n` : ''}${url ? `- **Web**: ${url}\n` : ''}${restaurant.precioMedio != null ? `- **Precio medio**: ${restaurant.precioMedio} € por persona (dos platos + bebida)\n` : ''}${restaurant.aceptaReservas != null ? `- **Reservas**: ${restaurant.aceptaReservas ? 'Sí, recomendadas' : 'No'}\n` : ''}${servicios.length ? `- **Servicios**: ${servicios.join(', ')}\n` : ''}${pagos.length ? `- **Formas de pago**: ${pagos.join(', ')}\n` : ''}
## Horario semanal

${horarios}

${dishesBlock ? `## Carta de platos\n\n${dishesBlock}\n\n` : ''}${winesBlock ? `## Carta de vinos\n\n${winesBlock}\n\n` : ''}${faqBlock ? `## Preguntas frecuentes\n\n${faqBlock}\n` : ''}
---

_Generado automáticamente desde el CMS. Última actualización con cada publicación._
`;

    return new Response(body, {
      headers: { 'content-type': 'text/markdown; charset=utf-8' }
    });
  };
}
