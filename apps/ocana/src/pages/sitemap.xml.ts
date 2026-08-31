import type { APIRoute } from 'astro';
import { localizedPath, resolveActiveLocales } from '@hosteleria/i18n-utils';
import { fetchGrupoData, fetchLegalPages } from '../lib/queries';

export const prerender = true;

/**
 * Sitemap multi-espacio (Ocaña). Genera para cada locale activo:
 *   · el hub (`/`, `/es/`, `/en/`)
 *   · cada espacio (`/restaurant`, `/apotheke`, `/sala` × cada locale)
 *   · cada página legal
 * Con hreflangs cruzados entre las variantes de idioma de cada URL.
 */
type UrlEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  alternates: Array<{ locale: string; url: string }>;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderUrl(u: UrlEntry): string {
  const alt = u.alternates
    .map(
      (a) =>
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(a.locale)}" href="${escapeXml(a.url)}" />`
    )
    .join('\n');
  const xdefault = u.alternates[0]
    ? `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.alternates[0].url)}" />`
    : '';
  return `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}${u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : ''}${u.priority ? `\n    <priority>${u.priority}</priority>` : ''}
${alt}
${xdefault}
  </url>`;
}

export const GET: APIRoute = async () => {
  const { restaurant, espacios } = await fetchGrupoData();
  const legalPages = await fetchLegalPages(restaurant._id);
  const siteUrl = (restaurant.dominio ?? '').replace(/\/$/, '');
  const defaultLocale = restaurant.idiomaPorDefecto?.codigo ?? 'ca';
  const locales = resolveActiveLocales(
    defaultLocale,
    (restaurant.idiomasActivos ?? []).map((l) => l.codigo)
  );

  const today = new Date().toISOString().slice(0, 10);
  const entries: UrlEntry[] = [];

  // Hub
  const hubAlternates = locales.map((l) => ({
    locale: l,
    url: `${siteUrl}${localizedPath('/', l, defaultLocale)}`
  }));
  for (const l of locales) {
    entries.push({
      loc: `${siteUrl}${localizedPath('/', l, defaultLocale)}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: l === defaultLocale ? '1.0' : '0.9',
      alternates: hubAlternates
    });
  }

  // Landing por espacio × locale
  for (const esp of espacios) {
    const slug = esp.slug?.current;
    if (!slug) continue;
    const alternates = locales.map((l) => ({
      locale: l,
      url: `${siteUrl}${localizedPath(`/${slug}`, l, defaultLocale)}`
    }));
    for (const l of locales) {
      entries.push({
        loc: `${siteUrl}${localizedPath(`/${slug}`, l, defaultLocale)}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: '0.9',
        alternates
      });
    }
  }

  // Legales × locale
  for (const p of legalPages) {
    const alternates = locales.map((l) => ({
      locale: l,
      url: `${siteUrl}${localizedPath(`/legal/${p.tipo}`, l, defaultLocale)}`
    }));
    for (const l of locales) {
      entries.push({
        loc: `${siteUrl}${localizedPath(`/legal/${p.tipo}`, l, defaultLocale)}`,
        lastmod: p.ultimaActualizacion ?? today,
        changefreq: 'yearly',
        priority: '0.3',
        alternates
      });
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map(renderUrl).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'content-type': 'application/xml; charset=utf-8' }
  });
};
