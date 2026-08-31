import type { APIRoute } from 'astro';
import { t } from '@hosteleria/i18n-utils';
import { fetchGrupoData, fetchEspacioMenu } from '../lib/queries';

export const prerender = true;

const DIAS_ES: Record<string, string> = {
  Mo: 'Lunes', Tu: 'Martes', We: 'Miércoles',
  Th: 'Jueves', Fr: 'Viernes', Sa: 'Sábado', Su: 'Domingo'
};

/**
 * llms.txt multi-espacio (Ocaña). Genera un documento único con: resumen
 * del grupo + un bloque por espacio con su descripción, horarios y carta.
 * https://llmstxt.org
 */
export const GET: APIRoute = async () => {
  const { restaurant, espacios } = await fetchGrupoData();
  const defaultLocale = restaurant.idiomaPorDefecto?.codigo ?? 'ca';
  const dir = restaurant.direccion ?? {};
  const contacto = restaurant.contacto ?? {};
  const redes = restaurant.redes ?? {};
  const url = restaurant.dominio ?? '';

  const nombre = restaurant.nombre;
  const resumen =
    t(restaurant.resumenIA, defaultLocale, defaultLocale) ||
    t(restaurant.seoDescripcion, defaultLocale, defaultLocale) ||
    '';

  const espacioBlocks: string[] = [];
  for (const esp of espacios) {
    const slug = esp.slug?.current ?? '';
    const nombreEsp = esp.nombre;
    const manifiesto = t(esp.manifiestoTexto, defaultLocale, defaultLocale);
    const nota = t(esp.heroNota, defaultLocale, defaultLocale);
    const desc = manifiesto || nota;

    const horarios = (esp.horariosSemana ?? [])
      .map((d) => {
        const dia = DIAS_ES[d.dia] ?? d.dia;
        const turnos = (d.turnos ?? []).map((tu) => `${tu.apertura}–${tu.cierre}`).join(', ');
        return `- **${dia}**: ${turnos || 'Cerrado'}`;
      })
      .join('\n');

    const menu = await fetchEspacioMenu(esp._id);
    const dishesBlock = menu.dishCategories
      .map((cat) => {
        const nombreCat = t(cat.nombre, defaultLocale, defaultLocale);
        const items = menu.dishes
          .filter((p) => p.categoria?._id === cat._id)
          .map((p) => {
            const nom = t(p.nombre, defaultLocale, defaultLocale);
            const nota = t(p.nota, defaultLocale, defaultLocale);
            const precio = p.precio != null ? ` — ${p.precio} €` : '';
            return `- **${nom}**${precio}${nota ? `. ${nota}.` : ''}`;
          })
          .join('\n');
        return items ? `#### ${nombreCat}\n\n${items}` : null;
      })
      .filter(Boolean)
      .join('\n\n');

    const winesBlock = menu.wineCategories
      .map((cat) => {
        const nombreCat = t(cat.nombre, defaultLocale, defaultLocale);
        const items = menu.wines
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
        return items ? `#### ${nombreCat}\n\n${items}` : null;
      })
      .filter(Boolean)
      .join('\n\n');

    espacioBlocks.push(`## ${nombreEsp}${esp.tipo ? ` (${esp.tipo})` : ''}

${desc ? `> ${desc}\n` : ''}
- **URL**: ${url}/${slug}
${horarios ? `\n### Horarios\n\n${horarios}\n` : ''}${dishesBlock ? `\n### Carta\n\n${dishesBlock}\n` : ''}${winesBlock ? `\n### Vinos\n\n${winesBlock}\n` : ''}`);
  }

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

## Datos del grupo

- **Nombre**: ${nombre}
- **Dirección**: ${[dir.calle, `${dir.codigoPostal ?? ''} ${dir.ciudad ?? ''}`.trim(), dir.barrio ? `(${dir.barrio})` : '', dir.pais].filter(Boolean).join(', ')}
${contacto.telefono ? `- **Teléfono**: ${contacto.telefono}\n` : ''}${contacto.email ? `- **Email**: ${contacto.email}\n` : ''}${redes.instagram ? `- **Instagram**: ${redes.instagram}\n` : ''}${url ? `- **Web**: ${url}\n` : ''}
## Espacios

${espacioBlocks.join('\n\n')}

${faqBlock ? `## Preguntas frecuentes\n\n${faqBlock}\n` : ''}
---

_Generado automáticamente desde el CMS. Última actualización con cada publicación._
`;

  return new Response(body, {
    headers: { 'content-type': 'text/markdown; charset=utf-8' }
  });
};
