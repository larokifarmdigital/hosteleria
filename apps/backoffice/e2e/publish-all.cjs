// Un solo «Publicar» para la web: la ficha y los espacios con cambios salen juntos, y la
// pantalla dice qué falta y dónde. Sobre «pruebas», como editor; publica de verdad y
// restaura por SQL al acabar («pruebas» no tiene hook: no se regenera ninguna web).
const { chromium } = require(process.env.PW);
const S = process.env.S, BASE = process.env.BASE;
const api = require('./api.cjs')(S + '/admin.json');
const editor = require('./api.cjs')(S + '/editor.json');
const state = require('./pruebas-state.cjs')(api);
const SPACE = state.SPACE;
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const step = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log(`FAIL  ${name} (excepción) — ${e.message.split('\n')[0]}`); } };
const pause = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const before = await state.read();
  const me = (await api('GET', '/restaurants/pruebas')).body.restaurant;
  if (me.rebuildHookUrl) throw new Error('«pruebas» tiene rebuildHookUrl: publicar lo llamaría');
  if (before.r.state === 'published' || before.s.state === 'published') throw new Error('«pruebas» debería empezar sin publicar');

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ storageState: S + '/editor.json', viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('response', r => { if (r.status() === 429) errors.push('429 ' + r.url()); });
    page.on('response', r => { if (r.status() >= 500) errors.push(r.status() + ' ' + r.request().method() + ' ' + r.url()); });

    console.log('— Api: todo o nada');
    await step('api', async () => {
      const r = await editor('POST', '/restaurants/pruebas/publish');
      check('con traducciones a medias: 400 TRANSLATIONS_INCOMPLETE', r.status === 400 && r.body.code === 'TRANSLATIONS_INCOMPLETE', r);
      check('dice en qué espacio falta', /Comedor principal · Título de la portada/.test(r.body.message ?? ''), r.body.message);
      const after = await state.read();
      check('no publica nada', after.r.state === 'draft' && !after.r.published_snapshot && after.s.state === 'draft' && !after.s.published_snapshot);
    });

    const top = () => page.locator('main').locator('div.sticky').first();
    const publishButton = () => page.getByRole('button', { name: /^Publicar (la web|cambios)$/ }).first();

    console.log('— Barra de arriba: un solo botón y qué falta');
    await step('bloqueado', async () => {
      await page.goto(`${BASE}/restaurants/pruebas`);
      await publishButton().waitFor();
      check('la web sin publicar lo dice arriba', /La web aún no se ha publicado/.test(await top().innerText()), await top().innerText());
      check('un solo botón: «Publicar la web»', (await publishButton().innerText()) === 'Publicar la web');
      await publishButton().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const text = await dialog.innerText();
      check('con traducciones a medias no deja y dice dónde, también lo del espacio', /Aún no se puede publicar/.test(text) && /sin traducir en el espacio «Comedor principal»/.test(text), text);
      const link = dialog.getByRole('link', { name: /sin traducir en el espacio/ });
      check('enlaza a la sección donde se arregla', (await link.getAttribute('href')) === `/restaurants/pruebas?s=cover&e=${SPACE}`);
      await dialog.getByRole('button', { name: 'Cerrar' }).first().click();
    });

    console.log('— La carta dice que sale sola');
    await step('carta', async () => {
      await page.goto(`${BASE}/restaurants/pruebas?s=menu`);
      await page.getByText(/Cada cambio sale en la web sin publicar/).waitFor({ timeout: 8000 });
      check('la sección lo explica', true);
    });
    await pause(20000);

    console.log('— Publicar todo de una vez');
    await step('publicar', async () => {
      const sp = (await api('GET', `/restaurants/pruebas/spaces/${SPACE}`)).body.space;
      const fill = v => ({ ...v, ca: v.ca || v.es, en: v.en || v.es });
      const saved = await api('PATCH', `/restaurants/pruebas/spaces/${SPACE}`, { hero: { ...sp.hero, title: fill(sp.hero.title), subtitle: fill(sp.hero.subtitle) }, state: 'draft' });
      check('traducciones completadas (guardado)', saved.status === 200, saved.status);

      await page.goto(`${BASE}/restaurants/pruebas?s=cover`);
      await publishButton().waitFor();
      await publishButton().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const dtext = await dialog.innerText();
      check('el diálogo dice qué sale: la ficha y el espacio', /¿Publicar en la web\?/.test(dtext) && /Los datos y textos del restaurante/.test(dtext) && /El espacio «Comedor principal»/.test(dtext), dtext);
      await dialog.getByRole('button', { name: 'Publicar', exact: true }).click();
      await page.getByText('Publicado', { exact: true }).first().waitFor();
      await page.waitForTimeout(1500);

      const after = await state.read();
      check('ficha publicada', after.r.state === 'published' && !!after.r.published_snapshot);
      check('espacio publicado', after.s.state === 'published' && !!after.s.published_snapshot);
      await page.getByText('La web está al día').first().waitFor({ timeout: 8000 });
      check('arriba: la web está al día y el botón pasa a «Ver mi web»', await page.getByRole('link', { name: /Ver mi web/ }).first().isVisible());
    });

    // Cada pantalla pide varias cosas al api: se deja respirar el límite de 100 por minuto.
    await pause(30000);
    console.log('— Un cambio después');
    await step('cambio', async () => {
      await page.getByRole('navigation', { name: 'Secciones de la web' }).getByRole('button', { name: /^Contacto y reservas/ }).click();
      await page.locator('#r-founded').fill('1987');
      await page.getByText('Hay cambios sin publicar').first().waitFor({ timeout: 10000 });
      check('al guardarse solo, arriba aparece «Publicar cambios»', (await publishButton().innerText()) === 'Publicar cambios');
      await publishButton().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const dtext = await dialog.innerText();
      check('solo sale lo que cambió', /Los datos y textos del restaurante/.test(dtext) && !/El espacio «/.test(dtext), dtext);
      await dialog.getByRole('button', { name: 'Cancelar' }).click();

      await page.getByRole('navigation', { name: 'Secciones de la web' }).getByRole('button', { name: /^Resumen/ }).click();
      const discard = page.getByRole('button', { name: 'Descartar los cambios de los datos del restaurante' });
      check('en el resumen se puede deshacer lo no publicado', await discard.isVisible());
      await discard.click();
      await page.getByRole('dialog').getByRole('button', { name: 'Sí, descartar' }).click();
      await page.getByText('La web está al día').first().waitFor({ timeout: 10000 });
      const r = (await api('GET', '/restaurants/pruebas')).body.restaurant;
      check('descartar vuelve a lo publicado', r.state === 'published' && r.foundedYear !== 1987, [r.state, r.foundedYear]);
    });

    check('sin errores de página ni 5xx', errors.length === 0, errors.join(' || '));
  } finally {
    await browser.close();
    const diff = await state.restore(before);
    const after = await state.read();
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff), '· estado:', after.r.state, after.s.state);
    if (diff.length) fail++;
    await state.pool.end();
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
