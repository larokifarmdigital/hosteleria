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
    page.on('response', r => { if (r.status() >= 500) errors.push(r.status() + ' ' + r.request().method() + ' ' + r.url()); });
    const panel = () => page.locator('section', { has: page.getByRole('heading', { name: 'Publicación' }) });

    console.log('— Api: todo o nada');
    await step('api', async () => {
      const r = await editor('POST', '/restaurants/pruebas/publish');
      check('con traducciones a medias: 400 TRANSLATIONS_INCOMPLETE', r.status === 400 && r.body.code === 'TRANSLATIONS_INCOMPLETE', r);
      check('dice en qué espacio falta', /Comedor principal · Título de la portada/.test(r.body.message ?? ''), r.body.message);
      const after = await state.read();
      check('no publica nada', after.r.state === 'draft' && !after.r.published_snapshot && after.s.state === 'draft' && !after.s.published_snapshot);
    });

    console.log('— Ficha: se ve todo lo que falta, también lo del espacio');
    await step('ficha', async () => {
      await page.goto(`${BASE}/restaurants/pruebas`);
      await panel().waitFor();
      await page.waitForTimeout(800);
      const text = (await panel().innerText()).replace(/\n+/g, ' | ');
      console.log('   panel:', text);
      check('lista la ficha y el espacio', /Datos del restaurante/.test(text) && /Espacio «Comedor principal»/.test(text));
      check('marca lo que se edita aquí', /Datos del restaurante · lo que estás editando/.test(text));
      check('dice que nunca se publicaron', (text.match(/Nunca se ha publicado/g) ?? []).length === 2);
      const button = panel().getByRole('button', { name: 'Publicar todo' });
      check('un solo botón: «Publicar todo», bloqueado', await button.isDisabled());
      const link = panel().getByRole('link', { name: /textos sin traducir en el espacio «Comedor principal»/ });
      check('enlaza a lo que falta en el espacio', (await link.getAttribute('href')) === `/restaurants/pruebas/spaces/${SPACE}`);
      check('avisa de que la carta no se publica', /La carta y las páginas legales no hace falta publicarlas/.test(text));
      check('cabecera: «Sin publicar»', await page.getByText('Sin publicar', { exact: true }).first().isVisible());
      await link.click();
      await page.waitForURL(`**/spaces/${SPACE}`);
      check('el enlace lleva al espacio', true);
    });

    console.log('— Espacio: el mismo panel');
    await step('espacio', async () => {
      await panel().waitFor();
      await page.waitForTimeout(800);
      const text = (await panel().innerText()).replace(/\n+/g, ' | ');
      check('también lista la ficha', /Datos del restaurante/.test(text) && /Espacio «Comedor principal» · lo que estás editando/.test(text), text);
      check('lo de aquí, campo a campo', await panel().getByRole('button', { name: /Portada · Título/ }).isVisible());
      check('mantiene la cuenta de textos', /Para publicar, faltan por traducir 2 textos/.test(text), text);
    });

    console.log('— Carta: dice que sale sola');
    await step('carta', async () => {
      await page.goto(`${BASE}/dishes?r=pruebas`);
      check('la cabecera lo explica', await page.getByText(/La carta no hace falta publicarla/).isVisible());
    });
    await pause(20000);

    console.log('— Publicar todo de una vez');
    await step('publicar', async () => {
      const sp = (await api('GET', `/restaurants/pruebas/spaces/${SPACE}`)).body.space;
      const fill = v => ({ ...v, ca: v.ca || v.es, en: v.en || v.es });
      const saved = await api('PATCH', `/restaurants/pruebas/spaces/${SPACE}`, { hero: { ...sp.hero, title: fill(sp.hero.title), subtitle: fill(sp.hero.subtitle) }, state: 'draft' });
      check('traducciones completadas (guardado)', saved.status === 200, saved.status);

      await page.goto(`${BASE}/restaurants/pruebas/spaces/${SPACE}`);
      await panel().waitFor();
      await page.waitForTimeout(800);
      const button = panel().getByRole('button', { name: 'Publicar todo' });
      check('ya se puede publicar', await button.isEnabled());
      await button.click();
      const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
      await dialog.waitFor();
      const dtext = await dialog.innerText();
      check('el diálogo dice qué sale', /Datos del restaurante/.test(dtext) && /Espacio «Comedor principal»/.test(dtext), dtext);
      await dialog.getByRole('button', { name: 'Publicar todo' }).click();
      await page.getByText('Publicado', { exact: true }).first().waitFor();
      await page.waitForTimeout(1500);

      const after = await state.read();
      check('ficha publicada', after.r.state === 'published' && !!after.r.published_snapshot);
      check('espacio publicado', after.s.state === 'published' && !!after.s.published_snapshot);
      check('el panel dice que la web está al día', await panel().getByText('La web está al día.').isVisible());
      check('cabecera del espacio: «Publicado»', await page.getByText('Publicado', { exact: true }).first().isVisible());
    });

    console.log('— Un cambio después: solo lo que cambia');
    await step('cambio', async () => {
      const r = await api('PATCH', '/restaurants/pruebas', { foundedYear: 1999, state: 'draft' });
      check('ficha guardada en borrador', r.status === 200);
      await page.goto(`${BASE}/restaurants/pruebas`);
      await panel().waitFor();
      await page.waitForTimeout(800);
      const text = (await panel().innerText()).replace(/\n+/g, ' | ');
      check('solo la ficha, con cambios guardados', /Datos del restaurante · lo que estás editando/.test(text) && /Tiene cambios guardados/.test(text) && !/Espacio «/.test(text), text);
      check('botón «Publicar» (una sola cosa)', await panel().getByRole('button', { name: 'Publicar', exact: true }).isEnabled());
      check('descartar solo lo de aquí', await panel().getByRole('button', { name: 'Descartar los cambios de la ficha' }).isVisible());
      check('cabecera: «Cambios sin publicar»', await page.getByText('Cambios sin publicar', { exact: true }).first().isVisible());
      const sp = await page.goto(`${BASE}/restaurants/pruebas/spaces/${SPACE}`);
      await panel().waitFor();
      await page.waitForTimeout(800);
      check('desde el espacio también se ve el cambio de la ficha', /Datos del restaurante/.test(await panel().innerText()) && !!sp);
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
