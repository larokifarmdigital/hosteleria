// Un aviso que la web no acepta queda apuntado como fallo (el aviso sale después de responder).
const fs = require('fs');
const S = process.env.S, API = process.env.API;
const cookie = JSON.parse(fs.readFileSync(S + '/admin.json', 'utf8')).cookies.map(c => `${c.name}=${c.value}`).join('; ');
const api = async (method, path, body) => { const r = await fetch(API + path, { method, headers: { cookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const state = require('./pruebas-state.cjs')(api);
const all = (t) => ({ es: t, ca: t, en: t });
(async () => {
  const before = await state.read();
  const reb = (await state.pool.query(`SELECT last_rebuild_at, last_rebuild_ok FROM restaurants WHERE slug = 'pruebas'`)).rows[0];
  try {
    const SP = `/restaurants/pruebas/spaces/${state.SPACE}`;
    const sp = (await api('GET', SP)).body.space;
    await api('PATCH', SP, { hero: { ...sp.hero, title: all('x'), subtitle: {}, note: {}, metaLeft: {}, metaRight: {}, cta: {}, imageAlt: {} }, state: 'published' });
    await api('PATCH', '/restaurants/pruebas', { rebuildHookUrl: 'http://localhost:8797/nadie-escucha', state: 'published' });
    const t0 = Date.now();
    const r = await api('POST', '/restaurants/pruebas/rebuild');
    console.log('respuesta', r.status, Date.now() - t0, 'ms · al responder:', r.body.site.lastRebuildOk);
    await new Promise(res => setTimeout(res, 2500));
    const s = (await api('GET', '/restaurants/pruebas/site-status')).body.site;
    console.log('después:', s.lastRebuildOk, s.lastRebuildOk === false ? 'OK' : 'FALLO');
  } finally {
    await api('PATCH', '/restaurants/pruebas', { rebuildHookUrl: null });
    await state.pool.query(`UPDATE restaurants SET last_rebuild_at = $1, last_rebuild_ok = $2 WHERE slug = 'pruebas'`, [reb.last_rebuild_at, reb.last_rebuild_ok]);
    console.log('restaurado; diferencias:', JSON.stringify(await state.restore(before)));
    await state.pool.end();
  }
})();
