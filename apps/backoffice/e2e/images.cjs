const { chromium } = require(process.env.PW);
const path = require('path');
const S = process.env.S, BASE = process.env.BASE;
const api = require('./api.cjs')(S + '/admin.json');
const IMG = n => path.join(S, 'img', n);
const SPACE = 'fnnv25hq7v7k4gvs04wqsk3x';
const DISH = 'xl8484n07um5d0783idzbo9m';
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra ? ' — ' + extra : ''}`); };
const mediaList = async () => (await api('GET', '/media?restaurantSlug=pruebas')).body.media;
const step = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log(`FAIL  ${name} (excepción) — ${e.message.split('\n')[0]}`); } };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.request().method() + ' ' + r.url()); });
  const input = () => page.locator('main input[type=file]');
  const queue = () => page.getByRole('list', { name: 'Fotos que estás subiendo' });
  const tile = name => page.locator('#media-library').locator('xpath=ancestor::section').locator('li', { hasText: name });

  console.log('— A. Pantalla de imágenes');
  await step('A', async () => {
    await page.goto(BASE + '/media?r=pruebas');
    check('título y restaurante elegido', await page.getByRole('heading', { level: 1, name: 'Imágenes' }).isVisible() && await page.getByLabel('Restaurante').inputValue() === 'pruebas');
    check('estado vacío', await page.getByText('Todavía no hay fotos').isVisible());

    await input().setInputFiles(IMG('documento.pdf'));
    await queue().getByText('Este tipo de archivo no sirve').waitFor();
    check('PDF bloqueado antes de subir', (await mediaList()).length === 0);
    await page.getByRole('button', { name: 'Quitar documento.pdf' }).click();

    await input().setInputFiles(IMG('irreducible.gif'));
    await queue().getByText(/el máximo son 10 MB/).waitFor();
    check('más de 10 MB que no se puede reducir: bloqueada', (await mediaList()).length === 0 && !(await page.getByRole('button', { name: /Subir irreducible/ }).count()));
    await page.getByRole('button', { name: 'Quitar irreducible.gif' }).click();
    check('cola vacía tras quitar', (await queue().count()) === 0);

    await input().setInputFiles(IMG('pequena.jpg'));
    await queue().getByText(/Mide 600 px de ancho/).waitFor();
    check('aviso de dimensiones y no sube sola', (await mediaList()).length === 0, await queue().innerText());
    await page.getByRole('button', { name: 'Subir pequena.jpg de todos modos' }).click();
    await tile('pequena.jpg').waitFor({ timeout: 30000 });
    const m1 = await mediaList();
    check('subida tras aceptar el aviso, con dimensiones', m1.length === 1 && m1[0].width === 600 && m1[0].height === 400, JSON.stringify(m1));
    check('la foto pública responde', (await fetch(m1[0].publicUrl)).status === 200, m1[0].publicUrl);
    check('marca «Falta descripción»', await tile('pequena.jpg').getByText('Falta descripción').isVisible());

    await input().setInputFiles(IMG('enorme.png'));
    await queue().getByText(/Reducida para la web: pesaba 14,\d MB/).waitFor({ timeout: 30000 });
    console.log('      cola:', (await queue().innerText()).replace(/\n/g, ' | '));
    check('aviso de peso tras reducir', /Pesa \d+,\d MB\. La web tardará más en cargar/.test(await queue().innerText()));
    const big = page.getByRole('button', { name: 'Subir enorme.webp de todos modos' });
    if (await big.count()) await big.click();
    await tile('enorme.webp').waitFor({ timeout: 60000 });
    const reduced = (await mediaList()).find(m => m.name === 'enorme.webp');
    check('foto de 14 MB: se reduce en el navegador y sube', !!reduced && reduced.mimeType === 'image/webp' && reduced.sizeKb < 10000 && reduced.width === 2100, JSON.stringify(reduced));
    await api('DELETE', `/media/${reduced.id}`);
    await page.reload();
    await tile('pequena.jpg').waitFor();

    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: 250_000 });
    await input().setInputFiles(IMG('pesada.jpg'));
    const anyway = page.getByRole('button', { name: 'Subir pesada.webp de todos modos' });
    await Promise.race([anyway.waitFor(), page.getByRole('progressbar', { name: 'Subiendo pesada.webp' }).waitFor()]);
    if (await anyway.count()) await anyway.click();
    const bar = page.getByRole('progressbar', { name: 'Subiendo pesada.webp' });
    await bar.waitFor();
    const seen = new Set();
    for (let i = 0; i < 200 && await bar.count(); i++) { const v = await bar.getAttribute('value').catch(() => null); if (v !== null) seen.add(Number(v)); await page.waitForTimeout(150); }
    const mids = [...seen].filter(v => v > 0 && v < 100);
    check('progreso intermedio visible', mids.length >= 3, [...seen].join(','));
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await tile('pesada.webp').waitFor({ timeout: 60000 });
    check('foto pesada subida', (await mediaList()).length === 2);

    await input().setInputFiles([IMG('buena.jpg'), IMG('plato.jpg')]);
    await tile('buena.jpg').waitFor({ timeout: 30000 });
    await tile('plato.jpg').waitFor({ timeout: 30000 });
    check('dos fotos sin avisos suben solas', (await mediaList()).length === 4 && (await queue().count()) === 0);
    check('anuncio para lector de pantalla', /se ha subido/.test(await page.locator('main p[role=status].sr-only').first().innerText()));

    // Arrastrar y soltar
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 900; c.height = 900; c.getContext('2d').fillRect(0, 0, 900, 900);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
      const dt = new DataTransfer(); dt.items.add(new File([blob], 'Soltada Ñ 01.JPG', { type: 'image/jpeg' }));
      const zone = document.querySelector('main input[type=file]').parentElement;
      zone.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 150));
      window.__dragClass = zone.className;
      zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    });
    check('la zona se resalta al arrastrar', /color-accent-soft/.test(await page.evaluate(() => window.__dragClass)));
    await tile('soltada-n-01.jpg').waitFor({ timeout: 30000 });
    check('soltar una foto la sube', (await mediaList()).length === 5);

    // Fallo de subida: no deja basura y se puede reintentar
    await page.route('**/*.r2.cloudflarestorage.com/**', r => r.request().method() === 'PUT' ? r.abort() : r.continue());
    await input().setInputFiles(IMG('buena.jpg'));
    await queue().getByText(/No se ha podido subir la foto/).waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    check('fallo de subida: mensaje y sin fila huérfana', (await mediaList()).length === 5);
    await page.unroute('**/*.r2.cloudflarestorage.com/**');
    await page.getByRole('button', { name: 'Reintentar la subida de buena.jpg' }).click();
    await page.waitForFunction(() => document.querySelectorAll('#media-library').length && [...document.querySelectorAll('main li')].filter(li => li.textContent.includes('buena.jpg')).length === 2, null, { timeout: 30000 });
    for (let i = 0; i < 20 && (await mediaList()).length < 6; i++) await page.waitForTimeout(1000);
    check('reintentar sube la foto', (await mediaList()).length === 6);

    // Descripción obligatoria en todos los idiomas
    await tile('plato.jpg').getByRole('button', { name: /Describir/ }).click();
    const dlg = page.getByRole('dialog', { name: 'Descripción de la foto' });
    await dlg.waitFor();
    await dlg.getByRole('button', { name: 'Guardar descripción' }).click();
    check('vacía: un error por idioma', (await dlg.getByText(/Escribe la descripción en/).count()) === 3);
    check('foco en el primer campo con error', await dlg.locator('input:focus').count() === 1 && await dlg.locator('input:focus').getAttribute('aria-invalid') === 'true');
    const fields = dlg.getByRole('textbox');
    const labels = await dlg.locator('label').allInnerTexts();
    check('un campo por idioma, etiquetado', labels.length === 3 && labels.every(l => /Descripción en /.test(l)), labels.join('|'));
    await fields.nth(0).fill('Text de prova 1');
    await dlg.getByRole('button', { name: 'Guardar descripción' }).click();
    check('con un idioma no basta', (await dlg.getByText(/Escribe la descripción en/).count()) === 2 && (await mediaList()).every(m => !m.hasAltText));
    await fields.nth(1).fill('Test text 2'); await fields.nth(2).fill('Texto de prueba 3');
    await dlg.getByRole('button', { name: 'Guardar descripción' }).click();
    await dlg.waitFor({ state: 'hidden' });
    const plato = (await mediaList()).find(m => m.name === 'plato.jpg');
    check('descripción guardada en los 3 idiomas', Object.keys(plato.altText).length === 3 && plato.hasAltText, JSON.stringify(plato.altText));
    await page.waitForTimeout(600);
    check('desaparece «Falta descripción» de esa foto', (await tile('plato.jpg').getByText('Falta descripción').count()) === 0);
    await page.getByLabel('Mostrar').selectOption('missing');
    check('filtro «Sin descripción»', (await tile('plato.jpg').count()) === 0 && (await tile('pesada.webp').count()) === 1);
    await page.getByLabel('Mostrar').selectOption('all');

    // Borrar una que no se usa
    await tile('soltada-n-01.jpg').getByRole('button', { name: /Borrar/ }).click();
    const del = page.getByRole('dialog', { name: /¿Borrar «soltada-n-01.jpg»\?/ });
    await del.waitFor();
    await del.getByText('No se usa en ningún sitio').waitFor();
    await del.getByRole('button', { name: 'Sí, borrar' }).click();
    await del.waitFor({ state: 'hidden' });
    await tile('soltada-n-01.jpg').waitFor({ state: 'detached' });
    check('borrar una foto sin uso', (await mediaList()).length === 5);
  });

  await new Promise(r => setTimeout(r, 62000)); // el api limita a 100 peticiones por minuto y usuario
  console.log('— B. Portada del espacio');
  await step('B', async () => {
    await page.goto(`${BASE}/restaurants/pruebas/spaces/${SPACE}`);
    const group = page.getByRole('group', { name: 'Foto de portada' });
    await group.getByText('Sin foto').waitFor();
    check('campo de foto de portada, sin foto', await group.getByText('Sin foto').isVisible() && await group.getByRole('button', { name: 'Elegir foto' }).isVisible());
    check('sin foto no se pide descripción', (await page.getByLabel(/Descripción de la foto/).count()) === 0);
    await group.getByRole('button', { name: 'Elegir foto' }).click();
    const picker = page.getByRole('dialog', { name: 'Elegir foto' });
    await picker.waitFor();
    await picker.getByRole('button', { name: /^Usar la foto/ }).first().waitFor();
    check('el selector lista las fotos y permite subir', (await picker.getByRole('button', { name: /^Usar la foto/ }).count()) === 5 && await picker.getByRole('heading', { name: 'Subir nueva' }).isVisible());
    await picker.getByRole('button', { name: 'Usar la foto: pequena.jpg' }).click();
    const describe = page.getByRole('dialog', { name: 'Describe la foto' });
    await describe.waitFor();
    await describe.getByRole('button', { name: 'Guardar y usar esta foto' }).click();
    check('foto sin descripción: no se puede asignar', (await describe.getByText(/Escribe la descripción en/).count()) === 3);
    await describe.getByRole('button', { name: 'Volver a las fotos' }).click();
    await picker.waitFor();
    await picker.getByRole('button', { name: 'Usar la foto: Texto de prueba 3' }).click();
    await picker.waitFor({ state: 'hidden' });
    check('foto con descripción: se asigna y se ve', await group.locator('img').getAttribute('alt') === 'Texto de prueba 3');
    check('la descripción de la foto entra en la portada', await page.locator('#hero-imageAlt-es').inputValue() === 'Texto de prueba 3' && await page.locator('#hero-imageAlt-ca').inputValue() === 'Text de prova 1');
    check('aparece la barra de guardar', await page.getByRole('button', { name: 'Guardar', exact: true }).isVisible());

    await page.locator('#hero-imageAlt-es').fill('');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.getByText('Describe la foto en Español.').waitFor();
    let sp = (await api('GET', `/restaurants/pruebas/spaces/${SPACE}`)).body.space;
    check('portada con foto sin descripción no se guarda', !sp.hero.imageAssetId);
    await page.locator('#hero-imageAlt-es').fill('Comedor con mesas preparadas');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.getByText('Cambios guardados').waitFor();
    sp = (await api('GET', `/restaurants/pruebas/spaces/${SPACE}`)).body.space;
    const plato = (await mediaList()).find(m => m.name === 'plato.jpg');
    check('guardado: foto y descripción en el borrador', sp.hero.imageAssetId === plato.id && sp.hero.imageAlt.es === 'Comedor con mesas preparadas' && sp.hero.title.es === 'Cocina de mercado,' && sp.state === 'draft', JSON.stringify(sp.hero));
    await page.reload();
    check('tras recargar sigue la foto', await page.getByRole('group', { name: 'Foto de portada' }).locator('img').getAttribute('src') === plato.publicUrl);

    // Subir nueva desde dentro del selector
    await page.getByRole('group', { name: 'Foto de portada' }).getByRole('button', { name: 'Cambiar foto' }).click();
    await picker.waitFor();
    check('marca la foto actual', (await picker.getByRole('button', { name: /\(la actual\)/ }).count()) === 1 && await picker.getByText('Actual', { exact: true }).isVisible());
    await picker.locator('input[type=file]').setInputFiles(IMG('pequena.jpg'));
    await picker.getByText(/En la portada se verá borrosa en pantallas grandes; mejor al menos 1600 px/).waitFor();
    check('en el selector de portada avisa con el mínimo de portada', true);
    await picker.getByRole('button', { name: 'Quitar pequena.jpg' }).click();
    await picker.locator('input[type=file]').setInputFiles(IMG('buena.jpg'));
    await describe.waitFor({ timeout: 30000 });
    check('subir nueva lleva directo a describirla', true);
    const f = describe.getByRole('textbox');
    await f.nth(0).fill('Sala nova'); await f.nth(1).fill('New room'); await f.nth(2).fill('Sala nueva');
    await describe.getByRole('button', { name: 'Guardar y usar esta foto' }).click();
    await describe.waitFor({ state: 'hidden' });
    check('la nueva queda elegida con su descripción', await page.locator('#hero-imageAlt-es').inputValue() === 'Sala nueva' && await page.getByRole('group', { name: 'Foto de portada' }).locator('img').getAttribute('alt') === 'Sala nueva');
    await page.getByRole('button', { name: 'Deshacer' }).click();
    check('descartar vuelve a la foto guardada', await page.getByRole('group', { name: 'Foto de portada' }).locator('img').getAttribute('src') === plato.publicUrl && await page.locator('#hero-imageAlt-es').inputValue() === 'Comedor con mesas preparadas');
  });

  await new Promise(r => setTimeout(r, 62000)); // el api limita a 100 peticiones por minuto y usuario
  console.log('— C. Foto del plato');
  await step('C', async () => {
    // plato.jpg ya es la portada; para el plato usamos pesada.jpg, que no tiene descripción
    await page.goto(BASE + '/dishes?r=pruebas');
    await page.getByRole('button', { name: 'Editar Escalivada con anchoa' }).click();
    const sheet = page.getByRole('dialog', { name: 'Editar plato' });
    const group = sheet.getByRole('group', { name: 'Foto del plato' });
    await group.getByRole('button', { name: 'Elegir foto' }).click();
    const picker = page.getByRole('dialog', { name: 'Elegir foto' });
    await picker.getByRole('button', { name: 'Usar la foto: pesada.webp' }).click();
    const describe = page.getByRole('dialog', { name: 'Describe la foto' });
    const f = describe.getByRole('textbox');
    await f.nth(0).fill('Escalivada amb anxova al plat'); await f.nth(1).fill('Escalivada with anchovy on a plate'); await f.nth(2).fill('Escalivada con anchoa en el plato');
    await f.nth(2).press('Enter');
    await describe.waitFor({ state: 'hidden' });
    check('describir no cierra ni envía el panel del plato', await sheet.isVisible() && (await api('GET', `/dishes/${DISH}`)).body.dish.imageAssetId === null);
    check('el panel muestra la foto y su descripción', await group.locator('img').isVisible() && await group.getByText('Escalivada con anchoa en el plato').isVisible());
    await sheet.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.getByText('Plato guardado').waitFor();
    const pesada = (await mediaList()).find(m => m.name === 'pesada.webp');
    const dish = (await api('GET', `/dishes/${DISH}`)).body.dish;
    check('plato guardado con su foto', dish.imageAssetId === pesada.id && dish.name.es === 'Escalivada con anchoa');
    await page.locator(`main li img[src="${pesada.publicUrl}"]`).waitFor();
    check('miniatura en la lista de la carta', true);

    // Aviso al borrar fotos en uso
    await page.goto(BASE + '/media?r=pruebas');
    await tile('pesada.webp').getByRole('button', { name: /Borrar/ }).click();
    let dlg = page.getByRole('dialog', { name: 'Esta foto se está usando' });
    await dlg.waitFor();
    check('aviso: en uso por un plato, sin opción de borrar', await dlg.getByText('Plato «Escalivada con anchoa»').isVisible() && (await dlg.getByRole('button', { name: /borrar/i }).count()) === 0);
    await dlg.getByRole('button', { name: 'Entendido' }).click();
    await tile('plato.jpg').getByRole('button', { name: /Borrar/ }).click();
    dlg = page.getByRole('dialog', { name: 'Esta foto se está usando' });
    await dlg.waitFor();
    check('aviso: en uso como portada', await dlg.getByText('Portada de «Comedor principal»').isVisible());
    await dlg.getByRole('button', { name: 'Entendido' }).click();
    const r = await api('DELETE', `/media/${pesada.id}`);
    check('el api tampoco deja borrarla', r.status === 400 && r.body.code === 'MEDIA_IN_USE', JSON.stringify(r));

    // Quitar la foto del plato
    await page.goto(BASE + '/dishes?r=pruebas');
    await page.getByRole('button', { name: 'Editar Escalivada con anchoa' }).click();
    await sheet.getByRole('button', { name: 'Quitar foto' }).click();
    check('quitar deja «Sin foto»', await sheet.getByText('Sin foto').isVisible());
    await sheet.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.getByText('Plato guardado').waitFor();
    check('plato sin foto en el api', (await api('GET', `/dishes/${DISH}`)).body.dish.imageAssetId === null);

    // Plato nuevo: el panel también lo ofrece (sin guardar)
    await page.getByRole('button', { name: 'Añadir plato', exact: true }).click();
    check('plato nuevo ofrece foto', await page.getByRole('dialog', { name: 'Nuevo plato' }).getByRole('group', { name: 'Foto del plato' }).isVisible());
  });

  await new Promise(r => setTimeout(r, 62000)); // el api limita a 100 peticiones por minuto y usuario
  console.log('— D. Móvil');
  await step('D', async () => {
    const m = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await m.newPage();
    await p.goto(BASE + '/media?r=pruebas');
    check('sin scroll horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    const before = (await mediaList()).length;
    await p.locator('main input[type=file]').setInputFiles(IMG('plato.jpg'));
    await p.waitForFunction(n => document.querySelectorAll('main section:last-of-type ul > li').length === n, before + 1, { timeout: 30000 });
    check('subir desde el móvil', (await mediaList()).length === before + 1);
    const box = await p.getByRole('button', { name: 'Elegir fotos' }).boundingBox();
    check('botón de elegir con zona táctil de 44 px', box.height >= 44, String(box.height));
    await p.goto(`${BASE}/restaurants/pruebas/spaces/${SPACE}`);
    await p.getByRole('group', { name: 'Foto de portada' }).getByRole('button', { name: 'Cambiar foto' }).click();
    const picker = p.getByRole('dialog', { name: 'Elegir foto' });
    await picker.waitFor();
    const pb = await picker.boundingBox();
    check('el selector cabe en la pantalla del móvil', pb.x >= 0 && pb.x + pb.width <= 390 && pb.height <= 844, JSON.stringify(pb));
    await m.close();
  });

  const unexpected = errors.filter(e => !/net::ERR_FAILED/.test(e) && !/Failed to load resource/.test(e));
  check('sin errores de consola ni respuestas de error', unexpected.length === 0, unexpected.slice(0, 5).join(' | '));
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
