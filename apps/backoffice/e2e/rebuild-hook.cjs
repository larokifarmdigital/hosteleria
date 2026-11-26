// M5: el api pide regenerar la landing cuando cambia algo que la web enseña.
// Contra el backoffice en local, sobre «pruebas», con un servidor local que hace de hook. Restaura al acabar.
const fs = require('fs'), http = require('http');
const S = process.env.S, API = process.env.API;
const cookieOf = (f) => JSON.parse(fs.readFileSync(`${S}/${f}`, 'utf8')).cookies.map(c => `${c.name}=${c.value}`).join('; ');
const caller = (cookie) => async (method, path, body) => {
  const r = await fetch(API + path, { method, headers: { cookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const api = caller(cookieOf('admin.json')), editor = caller(cookieOf('editor.json'));
const state = require('./pruebas-state.cjs')(api);
const all = (t) => ({ es: t, ca: t + ' (ca)', en: t + ' (en)' });
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + JSON.stringify(extra) : ''}`); };

(async () => {
  let calls = 0;
  const server = http.createServer((req, res) => { if (req.method === 'POST') calls++; res.writeHead(201).end('{}'); });
  await new Promise(r => server.listen(8799, r));
  const HOOK = 'http://localhost:8799/hook';
  const slow = [];
  // Cada paso: hace algo y comprueba cuántas llamadas al hook ha provocado.
  const step = async (name, expected, fn) => {
    const before = calls;
    const t0 = Date.now();
    const r = await fn();
    const ms = Date.now() - t0;
    // El aviso sale después de responder: se le da un momento antes de contar.
    await new Promise(res => setTimeout(res, 700));
    if (ms > 2500) slow.push(`${name} (${ms} ms)`);
    const statuses = [].concat(r).map(x => x.status);
    check(`${name}: ${expected} llamada(s)`, calls - before === expected && statuses.every(s => s >= 200 && s < 300), { llamadas: calls - before, statuses });
    return r;
  };

  const before = await state.read();
  const SP = `/restaurants/pruebas/spaces/${state.SPACE}`;
  let catId = null, wineCatId = null;
  try {
    const space0 = (await api('GET', SP)).body.space;
    const dish = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes[0];

    console.log('— Quién puede poner el hook');
    const e = await editor('PATCH', '/restaurants/pruebas', { rebuildHookUrl: 'https://otro.example/hook', state: 'draft' });
    check('un editor no puede cambiarlo', e.status === 403 && e.body.code === 'ADMIN_REQUIRED', e);
    const a = await api('PATCH', '/restaurants/pruebas', { rebuildHookUrl: HOOK });
    check('un administrador sí', a.status === 200 && a.body.restaurant.rebuildHookUrl === HOOK, a.status);
    const seen = await editor('GET', '/restaurants/pruebas');
    check('un editor no ve la URL del hook', seen.status === 200 && seen.body.restaurant.rebuildHookUrl === null, seen.status);

    console.log('— Quién puede cambiar la dirección de la web');
    const sameDomain = await editor('PATCH', '/restaurants/pruebas', { domain: before.r.domain, state: 'draft' });
    check('un editor guarda la ficha con la dirección de siempre', sameDomain.status === 200, sameDomain.status);
    const otherDomain = await editor('PATCH', '/restaurants/pruebas', { domain: 'otro.example', state: 'draft' });
    check('un editor no puede cambiarla', otherDomain.status === 403 && otherDomain.body.code === 'ADMIN_REQUIRED', otherDomain);

    console.log('— Sin publicar no se regenera nada');
    await step('cambiar un plato', 0, () => api('PATCH', `/dishes/${dish.id}`, { price: dish.price }));
    await step('guardar una página legal', 0, () => api('PUT', '/restaurants/pruebas/legal-pages/privacy', { title: all('Privacidad'), content: all('Texto'), lastUpdated: null }));
    await step('guardar la ficha en borrador', 0, () => api('PATCH', '/restaurants/pruebas', { foundedYear: 1998, state: 'draft' }));

    console.log('— Publicar');
    const hero = { ...space0.hero, title: all('Pruebas'), subtitle: {}, note: {}, metaLeft: {}, metaRight: {}, cta: {}, imageAlt: {} };
    await step('publicar el espacio con la ficha aún sin publicar', 0, () => api('PATCH', SP, { hero, state: 'published' }));
    await step('publicar la ficha', 1, () => api('PATCH', '/restaurants/pruebas', { state: 'published' }));
    await step('guardar la ficha en borrador', 0, () => api('PATCH', '/restaurants/pruebas', { foundedYear: 2001, state: 'draft' }));
    await step('volver a publicar la ficha', 1, () => api('PATCH', '/restaurants/pruebas', { state: 'published' }));
    await step('guardar el espacio en borrador', 0, () => api('PATCH', SP, { hero: { ...hero, title: all('Otra') }, state: 'draft' }));
    await step('publicar el espacio', 1, () => api('PATCH', SP, { state: 'published' }));
    await step('descartar cambios de la ficha', 0, async () => { await api('PATCH', '/restaurants/pruebas', { foundedYear: 2002, state: 'draft' }); return api('POST', '/restaurants/pruebas/discard'); });

    console.log('— Carta y páginas legales: esperan a publicar, no regeneran al guardar');
    await step('cambiar un plato', 0, () => api('PATCH', `/dishes/${dish.id}`, { active: !dish.active }));
    await step('dejarlo como estaba', 0, () => api('PATCH', `/dishes/${dish.id}`, { active: dish.active }));
    const c = await step('crear una categoría de platos', 0, () => api('POST', '/dishes/categories', { spaceId: state.SPACE, name: all('Temporal'), order: 99 }));
    catId = c.body.category.id;
    await step('renombrarla', 0, () => api('PATCH', `/dishes/categories/${catId}`, { name: all('Temporal 2') }));
    const d = await step('crear un plato', 0, () => api('POST', '/dishes', { spaceId: state.SPACE, categoryId: catId, name: all('Plato temporal'), price: 1 }));
    await step('borrar el plato', 0, () => api('DELETE', `/dishes/${d.body.dish.id}`));
    await step('borrar la categoría', 0, () => api('DELETE', `/dishes/categories/${catId}`)); catId = null;
    const w = await step('crear una categoría de vinos', 0, () => api('POST', '/wines/categories', { spaceId: state.SPACE, name: all('Temporal'), order: 99 }));
    wineCatId = w.body.category.id;
    const wn = await step('crear un vino', 0, () => api('POST', '/wines', { spaceId: state.SPACE, categoryId: wineCatId, name: 'Vino temporal' }));
    await step('cambiar el vino', 0, () => api('PATCH', `/wines/${wn.body.wine.id}`, { priceGlass: 4 }));
    await step('borrar el vino', 0, () => api('DELETE', `/wines/${wn.body.wine.id}`));
    await step('borrar la categoría de vinos', 0, () => api('DELETE', `/wines/categories/${wineCatId}`)); wineCatId = null;
    await step('guardar una página legal', 0, () => api('PUT', '/restaurants/pruebas/legal-pages/privacy', { title: all('Privacidad'), content: all('Texto nuevo'), lastUpdated: '2026-11-21' }));
    await step('borrar la página legal', 0, () => api('DELETE', '/restaurants/pruebas/legal-pages/privacy'));

    await step('publicar todo (carta y legales incluidos)', 1, () => api('POST', '/restaurants/pruebas/publish'));
    await step('publicar sin cambios no regenera', 0, () => api('POST', '/restaurants/pruebas/publish'));

    console.log('— Lo que no regenera');
    await step('una escritura que falla (plato inexistente)', 0, async () => { const r = await api('PATCH', '/dishes/no-existe', { price: 1 }); return { status: r.status === 404 ? 200 : 500 }; });
    await step('leer la carta', 0, () => api('GET', '/dishes?restaurantSlug=pruebas'));

    check('ningún guardado espera al aviso', slow.length === 0, slow);
    console.log('— Hook caído');
    await new Promise(r => server.close(r));
    const t0 = Date.now();
    const down = await api('PATCH', `/dishes/${dish.id}`, { price: dish.price });
    check('el cambio se guarda igual y no tarda', down.status === 200 && Date.now() - t0 < 5000, { status: down.status, ms: Date.now() - t0 });
  } catch (e) { fail++; console.log('EXCEPCIÓN', e.message); }
  finally {
    if (server.listening) await new Promise(r => server.close(r));
    if (catId) await api('DELETE', `/dishes/categories/${catId}`);
    if (wineCatId) await api('DELETE', `/wines/categories/${wineCatId}`);
    const off = await api('PATCH', '/restaurants/pruebas', { rebuildHookUrl: null });
    const diff = await state.restore(before);
    const after = (await api('GET', '/restaurants/pruebas')).body.restaurant;
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff), '· hook:', after.rebuildHookUrl, '· estado:', after.state);
    if (diff.length || off.status !== 200 || after.rebuildHookUrl !== null) fail++;
    await state.pool.end();
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
