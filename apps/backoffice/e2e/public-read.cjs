// M2: lectura pública contra el api en local (wrangler dev), sobre «pruebas». Restaura al acabar.
const fs = require('fs');
const S = process.env.S, API = process.env.API;
const cookie = JSON.parse(fs.readFileSync(S + '/admin.json', 'utf8')).cookies.map(c => `${c.name}=${c.value}`).join('; ');
const call = async (method, path, body, headers = {}) => {
  const r = await fetch(API + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j, headers: r.headers };
};
const api = (method, path, body) => call(method, path, body, { cookie });
const pub = (path, headers) => call('GET', '/public' + path, undefined, headers);
const state = require('./pruebas-state.cjs')(api);
const all = (t) => ({ es: t, ca: t + ' (ca)', en: t + ' (en)' });
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };

(async () => {
  const before = await state.read();
  let dishToRestore = null;
  try {
    const me = await api('GET', '/restaurants/pruebas');
    if (me.status !== 200) throw new Error('sesión no válida: ' + me.status);
    if (me.body.restaurant.rebuildHookUrl) throw new Error('«pruebas» tiene rebuildHookUrl: publicar lo llamaría');
    const space0 = (await api('GET', `/restaurants/pruebas/spaces/${state.SPACE}`)).body.space;

    console.log('— Sin publicar');
    const a = await pub('/restaurants/pruebas');
    const b = await pub('/restaurants/no-existe');
    check('un restaurante sin publicar responde 404', a.status === 404, a.status);
    check('igual que uno que no existe', b.status === 404 && a.body.code === b.body.code, [a.body, b.body]);

    console.log('— Publicado');
    const content = {
      foundedYear: 1998,
      about: { title: all('Nuestra historia'), body: all('Abrimos en 1998.') },
      faq: { items: [{ id: 'q1', question: all('¿Hay terraza?'), answer: all('Sí.') }] },
      uiTexts: { nav: { book: all('Reservar') } },
      aiSummary: all('Cocina de mercado.'),
      analyticsToken: 'tok_publico',
      business: { averagePrice: 35, paymentMethods: ['cash'] }
    };
    const p1 = await api('PATCH', '/restaurants/pruebas', { ...content, state: 'published' });
    check('publica la ficha', p1.status === 200, p1.body);
    const hero = { ...space0.hero, title: all('Ocaña'), subtitle: all('Plaza Reial'), note: {}, metaLeft: {}, metaRight: {}, cta: all('Reservar'), imageAlt: {} };
    const p2 = await api('PATCH', `/restaurants/pruebas/spaces/${state.SPACE}`, { hero, scheduleTexts: { title: all('Horario') }, bookingContact: { phone: '+34 930 000 000' }, state: 'published' });
    check('publica el espacio', p2.status === 200, p2.body);
    const l = await api('PUT', '/restaurants/pruebas/legal-pages/privacy', { title: all('Privacidad'), content: all('## Responsable\n\nOcaña S.L.'), lastUpdated: '2026-11-20' });
    check('guarda una página legal', l.status === 200, l.body);

    const r = await pub('/restaurants/pruebas');
    const site = r.body;
    check('responde 200 sin sesión', r.status === 200, r.body);
    check('caché pública que siempre revalida, con ETag', r.headers.get('cache-control') === 'public, max-age=0, must-revalidate' && !!r.headers.get('etag'), [r.headers.get('cache-control'), r.headers.get('etag')]);
    check('no pone cookies', !r.headers.get('set-cookie'));
    check('la ficha trae lo publicado', site.restaurant.slug === 'pruebas' && site.restaurant.foundedYear === 1998 && site.restaurant.about.title.ca === 'Nuestra historia (ca)' && site.restaurant.business.averagePrice === 35 && site.restaurant.uiTexts.nav.book.en === 'Reservar (en)', site.restaurant);
    check('idiomas y fecha de publicación', state.j(site.restaurant.activeLocales.slice().sort()) === '["ca","en","es"]' && site.restaurant.defaultLocale === 'es' && !!site.restaurant.publishedAt, site.restaurant);
    check('un espacio publicado, con portada, textos y contacto', site.spaces.length === 1 && site.spaces[0].id === state.SPACE && site.spaces[0].hero.title.en === 'Ocaña (en)' && site.spaces[0].scheduleTexts.title.es === 'Horario' && site.spaces[0].bookingContact.phone === '+34 930 000 000', site.spaces);
    check('el horario trae los siete días', site.spaces[0].schedule.map(d => d.day).join() === 'Mo,Tu,We,Th,Fr,Sa,Su', site.spaces[0].schedule);
    check('la página legal sale', site.legalPages.length === 1 && site.legalPages[0].type === 'privacy' && site.legalPages[0].content.es.startsWith('## Responsable') && !('id' in site.legalPages[0]), site.legalPages);
    const text = JSON.stringify(site);
    check('sin datos internos', !/rebuildHookUrl|publishedSnapshot|"state"|restaurantId|uploadedBy|Count"/.test(text));
    const dishes = site.spaces[0].dishCategories.flatMap(c => c.dishes);
    const adminDishes = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes;
    const active = adminDishes.filter(d => d.active);
    check('la carta trae los platos activos por categoría', dishes.length === active.length && active.every(d => dishes.some(x => x.id === d.id && x.price === d.price)), [dishes.length, active.length]);

    console.log('— Caché');
    const etag = r.headers.get('etag');
    const c1 = await pub('/restaurants/pruebas', { 'if-none-match': etag });
    check('con el mismo ETag responde 304 sin cuerpo', c1.status === 304 && c1.body === '', [c1.status, c1.body]);
    const c2 = await pub('/restaurants/pruebas', { cookie: 'hs_session=caducada' });
    check('una cookie caducada no cambia nada ni se limpia aquí', c2.status === 200 && !c2.headers.get('set-cookie') && c2.headers.get('etag') === etag);
    const c3 = await pub('/restaurants/pruebas', { cookie });
    check('con sesión de administrador sale lo mismo', c3.status === 200 && c3.headers.get('etag') === etag && !c3.headers.get('set-cookie'));
    const cors = await pub('/restaurants/pruebas', { origin: 'https://otra-web.example' });
    check('no abre CORS a otros orígenes', !cors.headers.get('access-control-allow-origin'));

    console.log('— El borrador no sale');
    const d1 = await api('PATCH', '/restaurants/pruebas', { foundedYear: 2001, about: { title: all('BORRADOR') }, analyticsToken: 'tok_borrador', state: 'draft' });
    const d2 = await api('PATCH', `/restaurants/pruebas/spaces/${state.SPACE}`, { hero: { ...hero, title: all('BORRADOR') }, bookingContact: { phone: '000' }, state: 'draft' });
    check('guarda cambios en borrador', d1.status === 200 && d2.status === 200, [d1.body, d2.body]);
    const r2 = await pub('/restaurants/pruebas');
    check('lo público sigue igual', r2.headers.get('etag') === etag && !JSON.stringify(r2.body).includes('BORRADOR') && r2.body.restaurant.analyticsToken === 'tok_publico');
    const p3 = await api('PATCH', '/restaurants/pruebas', { state: 'published' });
    const r3 = await pub('/restaurants/pruebas');
    check('al publicar la ficha, sale lo nuevo de la ficha y no lo del espacio', p3.status === 200 && r3.body.restaurant.foundedYear === 2001 && r3.body.restaurant.about.title.es === 'BORRADOR' && r3.body.spaces[0].hero.title.es === 'Ocaña' && r3.headers.get('etag') !== etag, [r3.body.restaurant.foundedYear, r3.body.spaces[0].hero.title]);

    console.log('— Carta (sin borrador)');
    if (active.length) {
      dishToRestore = active[0];
      const off = await api('PATCH', `/dishes/${dishToRestore.id}`, { active: false });
      const r4 = await pub('/restaurants/pruebas');
      const ids = r4.body.spaces[0].dishCategories.flatMap(c => c.dishes).map(d => d.id);
      check('un plato desactivado deja de salir al momento', off.status === 200 && !ids.includes(dishToRestore.id), [off.status, ids]);
      const on = await api('PATCH', `/dishes/${dishToRestore.id}`, { active: true });
      const r5 = await pub('/restaurants/pruebas');
      check('y vuelve al activarlo', on.status === 200 && r5.body.spaces[0].dishCategories.flatMap(c => c.dishes).some(d => d.id === dishToRestore.id));
      dishToRestore = null;
    } else console.log('  (sin platos activos: no se prueba)');

    console.log('— Otros métodos');
    const post = await call('POST', '/public/restaurants/pruebas', {});
    check('no admite escribir', post.status === 404 || post.status === 405, post.status);
  } catch (e) { fail++; console.log('EXCEPCIÓN', e.message); }
  finally {
    if (dishToRestore) await api('PATCH', `/dishes/${dishToRestore.id}`, { active: true });
    const diff = await state.restore(before);
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff));
    if (diff.length) fail++;
    const z = await pub('/restaurants/pruebas');
    check('tras restaurar, «pruebas» vuelve a no estar publicado', z.status === 404, z.status);
    await state.pool.end();
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
