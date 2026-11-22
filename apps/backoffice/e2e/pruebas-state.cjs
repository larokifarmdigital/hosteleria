// Foto del estado de «pruebas» en la BD y vuelta a ese estado por SQL (el api no sabe «despublicar»).
const API_DIR = require('path').resolve(__dirname, '../../api');
const req = (m) => require(require.resolve(m, { paths: [API_DIR] }));
req('dotenv').config({ path: API_DIR + '/.env.local' });
const { Pool, neonConfig } = req('@neondatabase/serverless');
neonConfig.webSocketConstructor = globalThis.WebSocket ?? req('ws');
const SPACE = 'fnnv25hq7v7k4gvs04wqsk3x';
const R_COLS = ['name', 'domain', 'logo_initial', 'cover_gradient', 'timezone', 'address', 'contact', 'socials', 'seo', 'accepts_bookings', 'show_socials', 'founded_year', 'branding', 'home_blocks', 'about', 'groups', 'map_url', 'show_reviews', 'ui_texts', 'faq', 'ai_summary', 'analytics_token', 'business', 'state', 'published_snapshot', 'last_published_at', 'default_locale_id'];
const S_COLS = ['name', 'hero', 'manifesto', 'descriptor', 'cover_gradient', 'gallery', 'schedule_texts', 'address', 'map_url', 'booking_contact', 'state', 'published_snapshot'];
const JSONB = new Set(['address', 'contact', 'socials', 'seo', 'branding', 'home_blocks', 'about', 'groups', 'ui_texts', 'faq', 'ai_summary', 'business', 'published_snapshot', 'hero', 'manifesto', 'gallery', 'schedule_texts', 'booking_contact']);
const sortKeys = (x) => Array.isArray(x) ? x.map(sortKeys) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, sortKeys(x[k])])) : x;
const j = (x) => JSON.stringify(sortKeys(x));

module.exports = function (api) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const read = async () => ({
    r: (await pool.query(`SELECT id, ${R_COLS.join(', ')} FROM restaurants WHERE slug = 'pruebas'`)).rows[0],
    s: (await pool.query(`SELECT ${S_COLS.join(', ')} FROM spaces WHERE id = $1`, [SPACE])).rows[0],
    locales: (await pool.query(`SELECT language_id FROM restaurant_locales WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'pruebas') ORDER BY 1`)).rows,
    // Las pruebas no cambian los horarios: solo se comprueba que siguen igual.
    schedule: (await pool.query(`SELECT day, open, close, "order" FROM space_schedule WHERE space_id = $1 ORDER BY day, "order"`, [SPACE])).rows,
    legal: (await pool.query(`SELECT type FROM legal_pages WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'pruebas') ORDER BY 1`)).rows,
    media: (await api('GET', '/media?restaurantSlug=pruebas')).body.media.map(m => m.id).sort()
  });
  return {
    SPACE, pool, read, j,
    /** Devuelve las partes que sigan distintas tras restaurar (vacío = idéntico). */
    async restore(before, uploaded = []) {
      const val = (c, v) => (JSONB.has(c) && v !== null ? JSON.stringify(v) : v);
      await pool.query(`UPDATE restaurants SET ${R_COLS.map((c, i) => `${c} = $${i + 2}${JSONB.has(c) ? '::jsonb' : ''}`).join(', ')} WHERE id = $1`, [before.r.id, ...R_COLS.map(c => val(c, before.r[c]))]);
      await pool.query(`UPDATE spaces SET ${S_COLS.map((c, i) => `${c} = $${i + 2}${JSONB.has(c) ? '::jsonb' : ''}`).join(', ')} WHERE id = $1`, [SPACE, ...S_COLS.map(c => val(c, before.s[c]))]);
      // «pruebas» no tenía páginas legales antes de las pruebas (se comprueba al empezar).
      for (const type of ['legal-notice', 'privacy', 'cookies']) {
        if (!before.legal.some(l => l.type === type)) await api('DELETE', `/restaurants/pruebas/legal-pages/${type}`);
      }
      for (const id of uploaded) { const d = await api('DELETE', `/media/${id}`); if (d.status !== 200) console.log('  no se pudo borrar', id, JSON.stringify(d.body)); }
      const after = await read();
      return Object.keys(before).filter(k => j(before[k]) !== j(after[k]));
    }
  };
};
