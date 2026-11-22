// Idiomas: avisos de traducción por idioma y por sección, y bloqueo al publicar con textos a medias
// (espacio, ficha, carta). Sobre «pruebas»; restaura al acabar.
const { chromium } = require(process.env.PW);
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
    await page.goto(`${BASE}/restaurants/pruebas/spaces/${SPACE}`);
    await page.getByRole('heading', { level: 1 }).waitFor();
    const names = await tabs().getByRole('button').allInnerTexts();
    console.log('   pestañas:', JSON.stringify(names));
    check('Català marca 2 textos', /faltan 2 textos/.test(await tab('Català').innerText()));
    check('English marca 1 texto', /falta 1 texto/.test(await tab('English').innerText()));
    check('Español sin marca', !/falta/.test(await tab('Español').innerText()));
    const cover = page.locator('section', { has: page.getByRole('heading', { name: 'Portada' }) }).first();
    check('sección Portada avisa de 2', await cover.getByText('Falta traducir 2 textos').isVisible());
    const intro = page.locator('section', { has: page.getByRole('heading', { name: 'Texto de presentación' }) }).first();
    check('sección Presentación sin aviso', (await intro.getByText(/Falta traducir/).count()) === 0);
    const w1 = await page.locator('#hero-title-es-warning').innerText(), w2 = await page.locator('#hero-subtitle-es-warning').innerText();
    console.log('   avisos:', w1, '|', w2);
    check('aviso por campo', /Falta en catal/i.test(w1) && / y /.test(w2));
    check('el aviso describe el campo', (await page.locator('#hero-title-es').getAttribute('aria-describedby')).includes('hero-title-es-warning'));
    check('campo sin texto en ningún idioma: sin aviso', (await page.locator('#hero-note-es-warning').count()) === 0);

    const publish = panel().getByRole('button', { name: 'Publicar' });
    check('publicar bloqueado', await publish.isDisabled());
    check('el botón apunta al motivo', ((await publish.getAttribute('aria-describedby')) || '').includes('publicar-traducciones'));
    console.log('   panel:', (await panel().innerText()).replace(/\n+/g, ' | '));
    check('lista de lo que falta', await panel().getByText('Para publicar, faltan por traducir 2 textos:').isVisible());

    await panel().getByRole('button', { name: /Portada · Subtítulo/ }).click();
    await page.waitForTimeout(300);
    check('el enlace cambia de idioma', (await tab('Català').getAttribute('aria-pressed')) === 'true');
    check('y pone el foco en el campo', await page.evaluate(() => document.activeElement?.id) === 'hero-subtitle-ca', await page.evaluate(() => document.activeElement?.id));

    const ref = page.locator('#hero-subtitle-ca-reference');
    check('referencia en el idioma principal', await ref.isVisible() && /coctelería de autor/.test(await ref.innerText()) && /Subtítulo en espa/i.test(await ref.innerText()), await ref.innerText().catch(() => 'no hay'));
    check('la referencia lleva lang=es', (await ref.locator('p[lang=es]').count()) === 1);
    check('la referencia describe el campo', (await page.locator('#hero-subtitle-ca').getAttribute('aria-describedby')).includes('hero-subtitle-ca-reference'));
    const box = await ref.boundingBox(), inp = await page.locator('#hero-subtitle-ca').boundingBox();
    check('lado a lado en escritorio', box && inp && box.x + box.width <= inp.x + 2, JSON.stringify([box, inp]));
    check('sin referencia si el principal está vacío', (await page.locator('#hero-note-ca-reference').count()) === 0);
    await tab('Español').click();
    check('en el idioma principal no hay referencia', (await page.locator('#hero-subtitle-es-reference').count()) === 0);

    // en vivo
    await tab('Català').click();
    await page.locator('#hero-subtitle-ca').fill('cocteleria d’autor');
    check('al escribir baja la cuenta de Català', /falta 1 texto/.test(await tab('Català').innerText()));
    await page.locator('#hero-title-ca').fill('Cuina de mercat,');
    check('Català completo: sin marca', !/falta/.test(await tab('Català').innerText()));
    check('sección baja a 1', await cover.getByText('Falta traducir 1 texto').isVisible());
    await tab('English').click();
    await page.locator('#hero-subtitle-en').fill('signature cocktails');
    check('todo traducido: sin avisos de sección', (await cover.getByText(/Falta traducir/).count()) === 0);
    check('sin lista de pendientes', (await panel().getByText(/faltan? .*traducir/).count()) === 0);
    check('con cambios sin guardar sigue sin publicar', await publish.isDisabled());

    // un texto nuevo solo en un idioma vuelve a bloquear
    await tab('Español').click();
    await page.locator('#manifesto-eyebrow-es').fill('Nuestra casa');
    check('texto nuevo en un idioma: aviso en Presentación', await intro.getByText('Falta traducir 1 texto').isVisible());
    check('vuelve la lista', await panel().getByRole('button', { name: /Texto de presentación · Antetítulo/ }).isVisible());
    await page.locator('#manifesto-eyebrow-es').fill('');
    check('al vaciarlo desaparece', (await intro.getByText(/Falta traducir/).count()) === 0);

    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByText('Cambios guardados').waitFor();
    await page.waitForTimeout(800);
    check('guardado y completo: se puede publicar', await publish.isEnabled());
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
    await page.goto(`${BASE}/restaurants/pruebas?tab=search`);
    await page.locator('#seo-title-es').waitFor();
    const google = page.locator('section', { has: page.getByRole('heading', { name: 'Cómo aparece en Google' }) }).first();
    check('sin pendientes al entrar', (await google.getByText(/Falta traducir/).count()) === 0 && (await panel().getByText(/traducir/).count()) === 0);
    await page.locator('#seo-title-es').fill('Ocaña, cocina de mercado');
    check('aviso de sección', await google.getByText('Falta traducir 1 texto').isVisible());
    check('aviso de campo', /Falta en/.test(await page.locator('#seo-title-es-warning').innerText()));
    check('pestañas marcadas', /falta 1 texto/.test(await tab('Català').innerText()) && /falta 1 texto/.test(await tab('English').innerText()));
    await panel().getByRole('button', { name: /Cómo aparece en Google · Título/ }).click();
    await page.waitForTimeout(300);
    check('el enlace lleva al campo en catalán', await page.evaluate(() => document.activeElement?.id) === 'seo-title-ca');
    check('referencia visible', /Ocaña, cocina de mercado/.test(await page.locator('#seo-title-ca-reference').innerText()));
    await page.getByRole('button', { name: 'Deshacer' }).click();
    check('deshacer limpia los avisos', (await google.getByText(/Falta traducir/).count()) === 0);
  });

  console.log('— D. Carta');
  await step('D', async () => {
    await page.goto(`${BASE}/dishes?r=pruebas`);
    await page.getByLabel('Mostrar').waitFor();
    await page.getByLabel('Mostrar').selectOption({ label: 'Falta traducción' });
    check('filtro: 1 resultado', await page.getByText('1 resultado', { exact: true }).isVisible());
    check('es la tortilla y dice qué falta', await page.getByText('Tortilla trufada').isVisible() && await page.locator('li', { hasText: 'Tortilla trufada' }).getByText('Falta traducir: CA').isVisible() && !(await page.getByText('Escalivada con anchoa').count()));
    await page.getByRole('button', { name: 'Editar Tortilla trufada' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.waitFor();
    check('panel: Català marcado', /falta 1 texto/.test(await sheet.getByRole('button', { name: /^Català/ }).innerText()));
    check('panel: aviso en el nombre', /Falta en catal/i.test(await sheet.locator('#name-es-warning').innerText()));
    await sheet.getByRole('button', { name: /^Català/ }).click();
    check('panel: referencia encima', /Tortilla trufada/.test(await sheet.locator('#name-ca-reference').innerText()));
    await sheet.locator('#note-es').evaluate(() => {});
    await sheet.getByRole('button', { name: /^Español/ }).click();
    await sheet.locator('#note-es').fill('Con trufa negra');
    check('descripción en un idioma: suben las cuentas', /faltan 2 textos/.test(await sheet.getByRole('button', { name: /^Català/ }).innerText()) && /falta 1 texto/.test(await sheet.getByRole('button', { name: /^English/ }).innerText()));
    await sheet.locator('#note-es').fill('');
    await page.waitForTimeout(400);
    await sheet.getByRole('button', { name: 'Cancelar' }).click();
    await sheet.waitFor({ state: 'hidden' });

    await page.getByLabel('Mostrar').selectOption({ label: 'Todos' });
    await page.getByRole('button', { name: 'Añadir categoría' }).click();
    const dlg = page.getByRole('dialog', { name: 'Nueva categoría' });
    await dlg.locator('#cat-es').fill('Postres');
    check('categoría: aviso en los idiomas vacíos', await dlg.locator('#cat-ca-warning').isVisible() && await dlg.locator('#cat-en-warning').isVisible() && !(await dlg.locator('#cat-es-warning').count()));
    await dlg.locator('#cat-ca').fill('Postres'); await dlg.locator('#cat-en').fill('Desserts');
    check('categoría completa: sin avisos', (await dlg.locator('[id$=-warning]').count()) === 0);
    await page.waitForTimeout(400);
    await dlg.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByRole('link', { name: /Vinos/ }).click();
    await page.waitForTimeout(800);
    const has = await page.getByLabel('Mostrar').count() ? await page.getByLabel('Mostrar').locator('option').allInnerTexts() : ['(sin categorías de vino)'];
    console.log('   filtro en vinos:', JSON.stringify(has));
  });

  console.log('— E. Móvil');
  await step('E', async () => {
    const m = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 390, height: 800 } });
    const p = await m.newPage();
    await p.goto(`${BASE}/restaurants/pruebas/spaces/${SPACE}`);
    await p.getByRole('group', { name: 'Idioma del contenido' }).getByRole('button', { name: /^Català/ }).click();
    const ref = await p.locator('#hero-cta-ca-reference').boundingBox(), inp = await p.locator('#hero-cta-ca').boundingBox();
    check('en móvil la referencia va encima', ref && inp && ref.y + ref.height <= inp.y, JSON.stringify([ref, inp]));
    check('sin scroll horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await p.screenshot({ path: S + '/f2-movil.png', fullPage: true });
    await m.close();
  });

  await page.goto(`${BASE}/restaurants/pruebas/spaces/${SPACE}`);
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
