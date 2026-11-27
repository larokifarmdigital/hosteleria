// Idiomas: avisos de traducción por idioma y por sección, y bloqueo al publicar con textos a medias
// (espacio, ficha, carta). Sobre «pruebas»; restaura al acabar.
const { chromium } = require(process.env.PW);
const select = require('./select.cjs');
const S = process.env.S, BASE = process.env.BASE;
const api = require('./api.cjs')(S + '/admin.json');
const state = require('./pruebas-state.cjs')(api);
const SPACE = 'fnnv25hq7v7k4gvs04wqsk3x';
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + extra : ''}`); };
const step = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log(`FAIL  ${name} (excepción) — ${e.message.split('\n')[0]}`); } };
(async () => {
  const before = await state.read();
  const dishesBefore = JSON.stringify((await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes.map(d => [d.id, d.name, d.note, d.active]).sort());
  const browser = await chromium.launch();
  try {
  const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.request().method() + ' ' + r.url()); });
  const tabs = () => page.getByRole('group', { name: 'Idioma del contenido' });
  const tab = name => tabs().getByRole('button', { name: new RegExp('^' + name) });
  const panel = () => page.locator('section', { has: page.getByRole('heading', { name: 'Publicación' }) });

  console.log('— A. Espacio');
  await step('A', async () => {
    await page.goto(`${BASE}/restaurants/pruebas?s=cover`);
    await page.locator('#hero-title-es').waitFor();
    const names = await tabs().getByRole('button').allInnerTexts();
    console.log('   pestañas:', JSON.stringify(names));
    check('Català marca 2 textos', /faltan 2 textos/.test(await tab('Català').innerText()));
    check('English marca 1 texto', /falta 1 texto/.test(await tab('English').innerText()));
    check('Español sin marca', !/falta/.test(await tab('Español').innerText()));
    // La Portada es un único bloque: cuánto falta lo dicen el menú de secciones y las pestañas de idioma.
    const coverMark = () => page.getByRole('navigation', { name: 'Secciones de la web' }).getByRole('button', { name: /^Portada/ }).innerText();
    check('el menú avisa de 2 en Portada', /falta traducir 2 textos/.test(await coverMark()), await coverMark());
    // Mientras se escribe en el idioma principal no hay avisos por campo: se ven en la pestaña del idioma que falta.
    check('en español, sin avisos por campo', (await page.locator('[id$="-es-warning"]').count()) === 0);

    // El menú de secciones marca lo que falta traducir; publicar lo dice antes de dejar hacerlo.
    const nav = () => page.getByRole('navigation', { name: 'Secciones de la web' });
    check('el menú marca la Portada con 2', /2/.test(await nav().getByRole('button', { name: /^Portada/ }).innerText()));

    await tab('Català').click();
    await page.locator('#hero-subtitle-ca').focus();
    check('se pasa a Català', (await tab('Català').getAttribute('aria-pressed')) === 'true');
    const w1 = await page.locator('#hero-title-ca-warning').innerText().catch(() => 'no hay');
    check('en la pestaña del idioma que falta, aviso por campo', /Falta en catal/i.test(w1), w1);
    check('el aviso describe el campo', (await page.locator('#hero-title-ca').getAttribute('aria-describedby')).includes('hero-title-ca-warning'));
    check('campo sin texto en ningún idioma: sin aviso', (await page.locator('#hero-note-ca-warning').count()) === 0);

    const ref = page.locator('#hero-subtitle-ca-reference');
    check('referencia en el idioma principal', await ref.isVisible() && /coctelería de autor/.test(await ref.innerText()) && /^En espa/i.test(await ref.innerText()), await ref.innerText().catch(() => 'no hay'));
    check('la referencia lleva lang=es', (await ref.locator('[lang=es]').count()) === 1);
    check('la referencia describe el campo', (await page.locator('#hero-subtitle-ca').getAttribute('aria-describedby')).includes('hero-subtitle-ca-reference'));
    const box = await ref.boundingBox(), inp = await page.locator('#hero-subtitle-ca').boundingBox();
    check('un solo campo: el original va debajo, en pequeño', box && inp && box.y >= inp.y + inp.height - 2 && Math.abs(box.x - inp.x) < 4, JSON.stringify([box, inp]));
    check('sin referencia si el principal está vacío', (await page.locator('#hero-note-ca-reference').count()) === 0);
    await tab('Español').click();
    check('en el idioma principal no hay referencia', (await page.locator('#hero-subtitle-es-reference').count()) === 0);

    // Con traducciones a medias, publicar dice qué falta y no deja.
    await page.getByRole('button', { name: 'Publicar la web' }).first().click();
    let dialog = page.getByRole('dialog');
    await dialog.waitFor();
    check('publicar bloqueado: dice qué falta', /Aún no se puede publicar/.test(await dialog.innerText()) && /sin traducir en el espacio/.test(await dialog.innerText()));
    await dialog.getByRole('button', { name: 'Cerrar' }).first().click();
    await dialog.waitFor({ state: 'hidden' });

    // en vivo
    await tab('Català').click();
    await page.locator('#hero-subtitle-ca').fill('cocteleria d’autor');
    check('al escribir baja la cuenta de Català', /falta 1 texto/.test(await tab('Català').innerText()));
    await page.locator('#hero-title-ca').fill('Cuina de mercat,');
    check('Català completo: sin marca', !/falta/.test(await tab('Català').innerText()));
    check('el menú baja a 1', /falta traducir 1 texto/.test(await coverMark()), await coverMark());
    await tab('English').click();
    await page.locator('#hero-subtitle-en').fill('signature cocktails');
    check('todo traducido: sin avisos en el menú', !/falta traducir/.test(await coverMark()), await coverMark());
    check('el menú ya no marca la Portada', !/\d/.test(await nav().getByRole('button', { name: /^Portada/ }).innerText()));

    // Se guarda solo; con todo traducido, publicar ya ofrece hacerlo.
    await page.getByText('Cambios guardados', { exact: true }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Publicar la web' }).first().click();
    dialog = page.getByRole('dialog');
    await dialog.waitFor();
    check('guardado y completo: se puede publicar', /¿Publicar en la web\?/.test(await dialog.innerText()), await dialog.innerText());
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await dialog.waitFor({ state: 'hidden' });

    // Un texto nuevo solo en un idioma vuelve a marcar la sección.
    await nav().getByRole('button', { name: /^Portada/ }).click();
    await tab('Español').click();
    await page.locator('#manifesto-eyebrow-es').fill('Nuestra casa');
    // El texto de presentación va dentro de Portada: lo que falta lo cuentan las pestañas de idioma.
    const pending = () => tabs().getByText(/faltan? \d+ textos?/).count();
    check('texto nuevo en un idioma: aviso en las pestañas de idioma', (await pending()) > 0);
    await page.locator('#manifesto-eyebrow-es').fill('');
    check('al vaciarlo desaparece', (await pending()) === 0);
    await page.waitForTimeout(2500);
  });

  console.log('— B. Api');
  await step('B', async () => {
    const sp = (await api('GET', `/restaurants/pruebas/spaces/${SPACE}`)).body.space;
    const partial = await api('PATCH', `/restaurants/pruebas/spaces/${SPACE}`, { hero: { ...sp.hero, cta: { es: 'Reservar' } }, state: 'draft' });
    check('guardar a medias como borrador: 200', partial.status === 200);
    const pub = await api('PATCH', `/restaurants/pruebas/spaces/${SPACE}`, { state: 'published' });
    console.log('   ', pub.status, JSON.stringify(pub.body));
    check('publicar a medias: 400 TRANSLATIONS_INCOMPLETE', pub.status === 400 && pub.body.code === 'TRANSLATIONS_INCOMPLETE');
    const after = (await api('GET', `/restaurants/pruebas/spaces/${SPACE}`)).body.space;
    check('sigue en borrador y sin versión publicada', after.state === 'draft' && !after.publishedSnapshot);
    const pubBody = await api('PATCH', `/restaurants/pruebas/spaces/${SPACE}`, { manifesto: { text: { es: 'solo es' } }, state: 'published' });
    check('publicar enviando un texto a medias: 400', pubBody.status === 400 && pubBody.body.code === 'TRANSLATIONS_INCOMPLETE');
    const again = (await api('GET', `/restaurants/pruebas/spaces/${SPACE}`)).body.space;
    check('el rechazo no guarda nada', JSON.stringify(again.manifesto) === JSON.stringify(after.manifesto) && again.state === 'draft');
    const rest = await api('PATCH', '/restaurants/pruebas', { seo: { title: { es: 'Ocaña' } }, state: 'published' });
    const r2 = (await api('GET', '/restaurants/pruebas')).body.restaurant;
    check('restaurante a medias: 400 y sin cambios', rest.status === 400 && rest.body.code === 'TRANSLATIONS_INCOMPLETE' && r2.state === 'draft' && !r2.seo?.title?.es, JSON.stringify([rest.status, r2.state, r2.seo]));
  });
  await page.waitForTimeout(20000);

  console.log('— C. Ficha del restaurante');
  await step('C', async () => {
    await page.goto(`${BASE}/restaurants/pruebas?s=search`);
    await page.locator('#seo-title-es').waitFor();
    const google = page.locator('section', { has: page.getByRole('heading', { name: 'Cómo aparece en Google' }) }).first();
    check('sin pendientes al entrar', (await google.getByText(/Falta traducir/).count()) === 0);
    await page.locator('#seo-title-es').fill('Ocaña, cocina de mercado');
    check('aviso de sección', await google.getByText('Falta traducir 1 texto').isVisible());
    check('en español, sin aviso de campo', (await page.locator('#seo-title-es-warning').count()) === 0);
    check('pestañas marcadas', /falta 1 texto/.test(await tab('Català').innerText()) && /falta 1 texto/.test(await tab('English').innerText()));
    await tab('Català').click();
    check('aviso de campo en la pestaña que falta', /Falta en/.test(await page.locator('#seo-title-ca-warning').innerText()));
    check('referencia visible', /Ocaña, cocina de mercado/.test(await page.locator('#seo-title-ca-reference').innerText()));
    await tab('Español').click();
    await page.locator('#seo-title-es').fill('');
    check('al vaciarlo se limpian los avisos', (await google.getByText(/Falta traducir/).count()) === 0);
    await page.waitForTimeout(2500);
  });

  console.log('— D. Carta');
  await step('D', async () => {
    await page.goto(`${BASE}/restaurants/pruebas?s=menu`);
    await page.getByLabel('Mostrar').waitFor();
    // La barra sale antes que la lista: se espera a los platos.
    await page.getByText('Tortilla trufada').first().waitFor();
    await select.pick(page, page.getByLabel('Mostrar'), { label: 'Falta traducción' });
    await page.getByText('1 resultado', { exact: true }).waitFor({ timeout: 5000 }).catch(() => {});
    check('filtro: 1 resultado', await page.getByText('1 resultado', { exact: true }).isVisible());
    check('es la tortilla y dice qué falta', await page.getByText('Tortilla trufada').isVisible() && await page.locator('tr', { hasText: 'Tortilla trufada' }).getByText('Falta traducir: CA').isVisible() && !(await page.getByText('Escalivada con anchoa').count()));
    await page.getByRole('button', { name: 'Editar Tortilla trufada' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.waitFor();
    check('panel: Català marcado', /falta 1 texto/.test(await sheet.getByRole('button', { name: /^Català/ }).innerText()));
    check('panel: en español, sin aviso en el nombre', (await sheet.locator('#name-es-warning').count()) === 0);
    await sheet.getByRole('button', { name: /^Català/ }).click();
    check('panel: aviso en el nombre en català', /Falta en catal/i.test(await sheet.locator('#name-ca-warning').innerText()));
    check('panel: original debajo', /Tortilla trufada/.test(await sheet.locator('#name-ca-reference').innerText()));
    await sheet.locator('#note-es').evaluate(() => {});
    await sheet.getByRole('button', { name: /^Español/ }).click();
    await sheet.locator('#note-es').fill('Con trufa negra');
    check('descripción en un idioma: suben las cuentas', /faltan 2 textos/.test(await sheet.getByRole('button', { name: /^Català/ }).innerText()) && /falta 1 texto/.test(await sheet.getByRole('button', { name: /^English/ }).innerText()));
    await sheet.locator('#note-es').fill('');
    await page.waitForTimeout(400);
    await sheet.getByRole('button', { name: 'Cancelar' }).click();
    await sheet.waitFor({ state: 'hidden' });

    await select.pick(page, page.getByLabel('Mostrar'), { label: 'Todos' });
    await page.getByRole('button', { name: 'Añadir categoría de platos' }).click();
    const dlg = page.getByRole('dialog', { name: 'Nueva categoría' });
    await dlg.locator('#cat-es').fill('Postres');
    check('categoría: aviso en los idiomas vacíos', await dlg.locator('#cat-ca-warning').isVisible() && await dlg.locator('#cat-en-warning').isVisible() && !(await dlg.locator('#cat-es-warning').count()));
    await dlg.locator('#cat-ca').fill('Postres'); await dlg.locator('#cat-en').fill('Desserts');
    check('categoría completa: sin avisos', (await dlg.locator('[id$=-warning]').count()) === 0);
    await page.waitForTimeout(400);
    await dlg.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByRole('navigation', { name: 'Partes de la carta' }).getByRole('link', { name: /Vinos/ }).click();
    await page.waitForTimeout(800);
    const has = await page.getByLabel('Mostrar').count() ? await page.getByLabel('Mostrar').locator('option').allInnerTexts() : ['(sin categorías de vino)'];
    console.log('   filtro en vinos:', JSON.stringify(has));
  });

  console.log('— E. Móvil');
  await step('E', async () => {
    const m = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 390, height: 800 } });
    const p = await m.newPage();
    await p.goto(`${BASE}/restaurants/pruebas?s=cover`);
    await p.getByRole('group', { name: 'Idioma del contenido' }).getByRole('button', { name: /^Català/ }).click();
    const ref = await p.locator('#hero-cta-ca-reference').boundingBox(), inp = await p.locator('#hero-cta-ca').boundingBox();
    check('en móvil el original también va debajo', ref && inp && ref.y >= inp.y + inp.height - 2, JSON.stringify([ref, inp]));
    check('sin scroll horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await p.screenshot({ path: S + '/f2-movil.png', fullPage: true });
    await m.close();
  });

  await page.goto(`${BASE}/restaurants/pruebas?s=cover`);
  await page.getByRole('group', { name: 'Idioma del contenido' }).getByRole('button', { name: /^Català/ }).click();
  await page.screenshot({ path: S + '/f2-espacio.png', fullPage: true });
  check('sin errores de consola ni respuestas de error (salvo los 400 buscados)', errors.filter(e => !/^400 PATCH/.test(e) && !/status of 400/.test(e)).length === 0, errors.join(' || '));
  } finally {
    await browser.close();
    const diff = await state.restore(before);
    const dishesAfter = JSON.stringify((await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes.map(d => [d.id, d.name, d.note, d.active]).sort());
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff), '· platos como antes:', dishesAfter === dishesBefore);
    if (diff.length || dishesAfter !== dishesBefore) fail++;
    await state.pool.end();
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
