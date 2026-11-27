// Entrega 3: «todo a Publicar». La web lee la copia que se guarda al publicar: la carta,
// los legales y el orden de los espacios esperan a «Publicar». Marcas «Sin publicar»,
// «Antes: …», «Recuperar» y descartar todo. Sobre «pruebas»; lo restaura al acabar.
const { chromium } = require(process.env.PW);
const S = process.env.S, BASE = process.env.BASE;
const api = require('./api.cjs')(S + '/admin.json');
const state = require('./pruebas-state.cjs')(api);
const SPACE = state.SPACE;
const all = (t) => ({ es: t, ca: t + ' (ca)', en: t + ' (en)' });
const pause = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const AXE = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } };
const publicSite = async () => (await fetch(`${process.env.API}/public/restaurants/pruebas`)).json();
const publicDish = (site, id) => site.spaces?.flatMap(s => s.dishCategories.flatMap(c => c.dishes)).find(d => d.id === id);

(async () => {
  const before = await state.read();
  const dishesBefore = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes;
  const browser = await chromium.launch();
  const audit = async (p, name) => {
    await p.waitForTimeout(400);
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await p.evaluate(async ({ AXE }) => (await axe.run(document, AXE)).violations.filter(v => v.id !== 'region').map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' ; ')), { AXE });
    check(`auditoría: ${name}`, res.length === 0, res);
  };
  const [d1, d2] = dishesBefore;
  try {
    console.log('— Primera publicación');
    const sp = (await api('GET', `/restaurants/pruebas/spaces/${SPACE}`)).body.space;
    const fill = v => ({ ...v, ca: v.ca || v.es, en: v.en || v.es });
    await api('PATCH', `/restaurants/pruebas/spaces/${SPACE}`, { hero: { ...sp.hero, title: fill(sp.hero.title), subtitle: fill(sp.hero.subtitle) }, state: 'draft' });
    const first = await api('POST', '/restaurants/pruebas/publish');
    check('la primera vez publica con todo traducido', first.status === 200, first.body);
    // Sin copia publicada, «Recuperar» no tendría de dónde: no se borra nada si la primera publicación falla.
    if (first.status !== 200) throw new Error('la primera publicación falló; se para antes de borrar nada');
    let site = await publicSite();
    check('la web enseña la carta publicada', publicDish(site, d1.id)?.price === d1.price, publicDish(site, d1.id));
    check('sin cambios no hay marcas', JSON.stringify((await api('GET', '/restaurants/pruebas/changes')).body.changes.rows) === '{}');

    console.log('— La carta espera a publicar');
    await api('PATCH', `/dishes/${d1.id}`, { price: d1.price + 3 });
    await api('DELETE', `/dishes/${d2.id}`);
    await api('PUT', '/restaurants/pruebas/legal-pages/privacy', { title: all('Privacidad'), content: all('Texto de prueba'), lastUpdated: null });
    site = await publicSite();
    check('un precio cambiado no sale hasta publicar', publicDish(site, d1.id)?.price === d1.price, publicDish(site, d1.id));
    check('un plato borrado sigue en la web hasta publicar', !!publicDish(site, d2.id));
    check('un texto legal nuevo no sale hasta publicar', !site.legalPages.some(p => p.type === 'privacy'));
    const ch = (await api('GET', '/restaurants/pruebas/changes')).body.changes;
    check('marcas: precio con el de antes, plato que se quitará, legal y carta del espacio',
      ch.rows[d1.id]?.status === 'changed' && ch.rows[d1.id]?.before?.price === d1.price && ch.removed.some(r => r.id === d2.id)
      && ch.legal.includes('privacy') && ch.menuSpaceIds.includes(SPACE), ch);

    console.log('— En el backoffice');
    const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/restaurants/pruebas?s=menu`);
    const name1 = d1.name.es;
    await page.getByRole('button', { name: `Editar ${name1}` }).waitFor();
    // En la tabla, el precio de antes va en su columna: se mira la fila entera.
    const row1 = page.getByRole('row').filter({ has: page.getByRole('button', { name: `Editar ${name1}` }) });
    check('el plato cambiado lleva «Sin publicar» y el precio de antes', /Sin publicar/.test(await row1.innerText()) && /Antes:/.test(await row1.innerText()), await row1.innerText());
    check('la carta explica que sale al publicar', await page.getByText(/salen en tu web al pulsar «Publicar cambios»/).first().isVisible());
    const restoreBtn = page.getByRole('button', { name: `Recuperar ${d2.name.es}` });
    check('el plato borrado se ve tachado, con «Recuperar»', await restoreBtn.isVisible() && await page.getByText('Se quitará de tu web al publicar').first().isVisible());
    await audit(page, 'carta con cambios sin publicar');
    await restoreBtn.click();
    await page.getByRole('button', { name: `Editar ${d2.name.es}` }).waitFor({ timeout: 10000 });
    const back = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes.find(d => d.id === d2.id);
    check('«Recuperar» lo vuelve a crear con su id, como estaba', !!back && back.price === d2.price);
    await page.getByRole('button', { name: 'Publicar cambios' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const text = await dialog.innerText();
    check('el diálogo dice qué sale: la carta y los legales', /La carta/.test(text) && /Los textos legales/.test(text), text);
    check('y ofrece descartar todo', await dialog.getByRole('button', { name: 'Descartar todos los cambios' }).isVisible());
    await audit(page, 'diálogo de publicar con carta y legales');
    await dialog.getByRole('button', { name: /^Publicar( igualmente)?$/ }).click();
    await dialog.waitFor({ state: 'detached', timeout: 15000 });
    site = await publicSite();
    check('al publicar, la web enseña el precio nuevo y el legal', publicDish(site, d1.id)?.price === d1.price + 3 && site.legalPages.some(p => p.type === 'privacy'));
    check('y no quedan marcas', JSON.stringify((await api('GET', '/restaurants/pruebas/changes')).body.changes.rows) === '{}');
    await pause(15000);

    console.log('— Descartar todo');
    await api('PATCH', `/dishes/${d1.id}`, { price: 99 });
    await api('DELETE', `/dishes/${d2.id}`);
    await page.goto(`${BASE}/restaurants/pruebas?s=menu`);
    await page.getByRole('button', { name: 'Publicar cambios' }).first().click();
    await dialog.getByRole('button', { name: 'Descartar todos los cambios' }).click();
    await dialog.getByRole('heading', { name: '¿Descartar todos los cambios?' }).waitFor();
    await audit(page, 'confirmar descartar todo');
    await dialog.getByRole('button', { name: 'Sí, descartar todo' }).click();
    await dialog.waitFor({ state: 'detached', timeout: 15000 });
    const after = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes;
    check('descartar devuelve el precio publicado y el plato borrado', after.find(d => d.id === d1.id)?.price === d1.price + 3 && !!after.find(d => d.id === d2.id));
    const upToDate = await page.getByRole('link', { name: /Ver mi web/ }).first().waitFor({ timeout: 10000 }).then(() => true, () => false);
    check('la barra dice que la web está al día', upToDate, upToDate ? '' : {
      changes: (await api('GET', '/restaurants/pruebas/changes')).body.changes,
      unpublished: (await api('GET', '/restaurants/pruebas/pending')).body.tasks?.filter(t => t.type === 'unpublished')
    });

    console.log('— Traducciones: avisan, no frenan');
    const r0 = (await api('GET', '/restaurants/pruebas')).body.restaurant;
    await api('PATCH', '/restaurants/pruebas', { about: { ...r0.about, title: { es: 'Solo en español' } }, state: 'draft' });
    const pub2 = await api('POST', '/restaurants/pruebas/publish');
    check('ya publicada, se publica aunque falte traducir y dice qué', pub2.status === 200 && pub2.body.published.untranslated.length > 0, pub2.body);
    await ctx.close();
  } catch (err) {
    check('excepción', false, String(err?.message ?? err).split('\n').slice(0, 3).join(' | '));
  } finally {
    // Carta como estaba (con su id), y después «pruebas» entero.
    const now = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes;
    if (!now.find(d => d.id === d2.id)) await api('POST', '/restaurants/pruebas/restore', { kind: 'dish', id: d2.id });
    for (const d of dishesBefore) await api('PATCH', `/dishes/${d.id}`, { price: d.price });
    const diff = await state.restore(before);
    const dishesAfter = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes;
    const key = list => list.map(d => [d.id, d.price, d.name, d.active]).sort((a, b) => a[0].localeCompare(b[0]));
    const sameDishes = state.j(key(dishesBefore)) === state.j(key(dishesAfter));
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff), '· platos como antes:', sameDishes);
    if (diff.length || !sameDishes) fail++;
    await browser.close();
    await state.pool.end();
    console.log(`${pass} correctas, ${fail} fallidas`);
    process.exit(fail ? 1 : 0);
  }
})();
