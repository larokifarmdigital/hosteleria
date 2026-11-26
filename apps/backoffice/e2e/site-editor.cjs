// Editor de la web: un menú de secciones, guardado automático y un solo «Publicar».
// Como editor, sobre «pruebas»; restaura por SQL al acabar.
const { chromium } = require(process.env.PW);
const S = process.env.S, BASE = process.env.BASE;
const api = require('./api.cjs')(S + '/admin.json');
const state = require('./pruebas-state.cjs')(api);
const SPACE = state.SPACE;
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const step = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log(`FAIL  ${name} (excepción) — ${e.message.split('\n')[0]}`); } };

(async () => {
  const before = await state.read();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ storageState: S + '/editor.json', viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('response', r => { if (r.status() >= 500) errors.push(r.status() + ' ' + r.url()); });
    const nav = () => page.getByRole('navigation', { name: 'Secciones de la web' });
    const status = () => page.getByRole('status').filter({ hasText: /guardad|Guardando|Sin guardar|No se ha podido/ }).first();
    const waitSaved = () => page.getByText('Cambios guardados', { exact: true }).waitFor({ timeout: 10000 });

    console.log('— Un solo menú');
    await step('menu', async () => {
      await page.goto(`${BASE}/restaurants/pruebas`);
      await nav().waitFor();
      const groups = await nav().locator('[data-group]').allInnerTexts();
      check('grupos: cada semana, la web y la información, siempre abiertos', groups.join('|') === 'Cada semana|Tu web|Información' && (await nav().locator('[aria-expanded]').count()) === 0, groups);
      check('entra por la Carta', await page.getByRole('heading', { level: 2, name: 'Carta' }).isVisible());
      check('legales y Google, directos en el menú', await nav().getByRole('button', { name: /^Textos legales/ }).isVisible() && await nav().getByRole('button', { name: /^Google y buscadores/ }).isVisible());
      check('el menú global ya no tiene Carta ni Imágenes', (await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /^(Carta|Imágenes)$/ }).count()) === 0);
      await nav().getByRole('button', { name: /^Horario/ }).click();
      await page.getByRole('heading', { level: 2, name: 'Horario' }).waitFor();
      check('cambiar de sección cambia la dirección', page.url().includes('s=hours'));
      check('la sección activa se marca', (await nav().getByRole('button', { name: /^Horario/ }).getAttribute('aria-current')) === 'page');
      await page.goBack();
      await page.getByRole('heading', { level: 2, name: 'Carta' }).waitFor({ timeout: 5000 });
      check('el botón atrás vuelve a la sección anterior', true);
      check('arriba: estado del guardado', /Todo guardado/.test(await status().innerText()));
      check('arriba: un solo botón, «Publicar la web»', await page.getByRole('button', { name: 'Publicar la web' }).first().isVisible());
    });

    console.log('— Guardado automático (ficha)');
    await step('autosave ficha', async () => {
      await nav().getByRole('button', { name: /^Sobre nosotros/ }).click();
      const title = page.locator('#about-title-es');
      await title.waitFor();
      await title.fill('Prueba de guardado automático');
      check('no hay botón Guardar', (await page.getByRole('button', { name: 'Guardar', exact: true }).count()) === 0);
      await waitSaved();
      const r = (await api('GET', '/restaurants/pruebas')).body.restaurant;
      check('se guarda solo, sin pulsar nada', r.about?.title?.es === 'Prueba de guardado automático', r.about?.title);
      check('queda como cambio sin publicar', r.state === 'draft');
    });

    console.log('— Un campo mal escrito no se guarda y lo dice');
    await step('invalid', async () => {
      await nav().getByRole('button', { name: /^Contacto y reservas/ }).click();
      const email = page.locator('#r-email');
      await email.waitFor();
      await email.fill('esto no es un email');
      await page.getByText(/Sin guardar/).waitFor({ timeout: 8000 });
      check('avisa arriba', await page.getByRole('button', { name: 'Ir al campo' }).isVisible());
      check('el menú marca la sección', /por corregir/.test(await nav().getByRole('button', { name: /^Contacto y reservas/ }).innerText().catch(() => '') + (await nav().getByRole('button', { name: /^Contacto y reservas/ }).textContent())));
      const r = (await api('GET', '/restaurants/pruebas')).body.restaurant;
      check('no se ha guardado', r.contact?.email !== 'esto no es un email');
      await nav().getByRole('button', { name: /^Horario/ }).click();
      await page.getByRole('button', { name: 'Ir al campo' }).click();
      await page.waitForTimeout(400);
      check('«Ir al campo» lleva a la sección y al campo', page.url().includes('s=contact') && await page.evaluate(() => document.activeElement?.id) === 'r-email', page.url());
      await email.fill('');
      await waitSaved();
      check('al corregirlo, se guarda', true);
    });

    console.log('— Guardado automático (espacio)');
    await step('autosave espacio', async () => {
      await nav().getByRole('button', { name: /^Portada/ }).click();
      const title = page.locator('#hero-title-es');
      await title.waitFor();
      await title.fill('Portada guardada sola');
      // El aviso ya decía «Cambios guardados» por la ficha: se espera a que el api lo tenga.
      let s;
      for (let i = 0; i < 12; i++) {
        await page.waitForTimeout(700);
        s = (await api('GET', `/restaurants/pruebas/spaces/${SPACE}`)).body.space;
        if (s.hero?.title?.es === 'Portada guardada sola') break;
      }
      check('el espacio se guarda solo', s.hero?.title?.es === 'Portada guardada sola', s.hero?.title);
    });

    console.log('— Publicar');
    await step('publicar', async () => {
      await page.getByRole('button', { name: 'Publicar la web' }).first().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const text = await dialog.innerText();
      check('con traducciones a medias, no deja publicar y dice qué falta', /Aún no se puede publicar/.test(text) && /sin traducir en el espacio «Comedor principal»/.test(text), text);
      await dialog.getByRole('link', { name: /sin traducir en el espacio/ }).click();
      await page.waitForURL(/s=cover/);
      check('el aviso lleva a la portada', true);
    });

    console.log('— Carta, fotos y legales dentro del editor');
    await step('secciones', async () => {
      await nav().getByRole('button', { name: /^Carta/ }).click();
      await page.getByText('Tortilla trufada').waitFor({ timeout: 8000 });
      check('la carta está en el editor, con sus títulos plegados debajo', await page.getByText('Títulos de la carta en la web').isVisible());
      await page.getByText('Títulos de la carta en la web').click();
      check('los títulos de la carta se editan ahí', await page.locator('#uiTexts-sections-dishesTitle-es').isVisible());
      check('ya no hay «Todas las fotos» en el menú', (await nav().getByRole('button', { name: /^(Todas las fotos|Fotos sin descripción)/ }).count()) === 0);
      check('ya no hay «Textos de la web» ni «Logo e iconos»', (await nav().getByRole('button', { name: /^(Textos de la web|Logo e iconos)/ }).count()) === 0);
      await nav().getByRole('button', { name: /^Google y buscadores/ }).click();
      await page.getByRole('heading', { level: 3, name: 'Icono de la web' }).waitFor();
      check('un solo icono, dentro de Google y buscadores', (await page.getByText('Icono', { exact: true }).count()) >= 1);
      await nav().getByRole('button', { name: /^Textos legales/ }).click();
      await page.getByRole('button', { name: /Política de privacidad/ }).click();
      check('cada texto legal se abre dentro', page.url().includes('p=privacy') && await page.getByRole('heading', { name: 'Política de privacidad' }).isVisible());
    });

    console.log('— Las direcciones de antes siguen funcionando');
    // Cada carga del editor son varias peticiones: se respira para no tocar el límite de 100 por minuto.
    await page.waitForTimeout(20000);
    await step('redirecciones', async () => {
      const go = async (from, expect) => { await page.goto(BASE + from); await page.waitForLoadState('networkidle'); return expect.every(part => page.url().includes(part)); };
      check('espacio → su sección', await go(`/restaurants/pruebas/spaces/${SPACE}?tab=hours`, ['/restaurants/pruebas?', 's=hours', `e=${SPACE}`]), page.url());
      check('carta → sección Carta', await go('/dishes?r=pruebas&ver=sin-traducir', ['s=menu', 'ver=sin-traducir']), page.url());
      check('imágenes → fotos sin descripción (del aviso de tareas)', await go('/media?r=pruebas', ['s=media']), page.url());
      check('legales → sección Textos legales', await go('/restaurants/pruebas/legal/cookies', ['s=legal', 'p=cookies']), page.url());
      check('textos de la web → Contacto, con el formulario de reserva', await go('/restaurants/pruebas?s=texts', ['s=texts']) && await page.getByRole('heading', { level: 2, name: 'Contacto y reservas' }).isVisible() && await page.getByText('Formulario de reserva', { exact: true }).first().isVisible());
      check('logo e iconos → Google y buscadores', await go('/restaurants/pruebas?s=brand', ['s=brand']) && await page.getByRole('heading', { level: 2, name: 'Google y buscadores' }).isVisible());
      check('ficha antigua (?tab=data) → Contacto', await go('/restaurants/pruebas?tab=data', ['tab=data']) && await page.getByRole('heading', { level: 2, name: 'Contacto y reservas' }).isVisible());
    });

    console.log('— Móvil');
    await page.waitForTimeout(20000);
    await step('móvil', async () => {
      const m = await browser.newContext({ storageState: S + '/editor.json', viewport: { width: 390, height: 844 } });
      const p = await m.newPage();
      await p.goto(`${BASE}/restaurants/pruebas?s=cover`);
      await p.locator('#seccion-picker').waitFor();
      check('menú de secciones en un desplegable', await p.locator('#seccion-picker').isVisible());
      check('la acción, abajo y a mano', await p.getByRole('button', { name: 'Publicar la web' }).last().isVisible());
      check('sin scroll horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await p.locator('#seccion-picker').selectOption('hours');
      await p.getByRole('heading', { level: 2, name: 'Horario' }).waitFor();
      check('elegir en el desplegable abre la sección', p.url().includes('s=hours'));
      await m.close();
    });

    check('sin errores de página ni 5xx', errors.length === 0, errors.join(' || '));
  } finally {
    await browser.close();
    const diff = await state.restore(before);
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff));
    if (diff.length) fail++;
    await state.pool.end();
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
