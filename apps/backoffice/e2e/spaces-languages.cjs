// Entrar a editar un restaurante: gestión de espacios (añadir, ordenar, principal, eliminar),
// idiomas de la web, dirección de la web, pestañas del espacio y alta de restaurantes.
// Sobre «pruebas»; borra lo que crea y restaura al acabar.
const { chromium } = require(process.env.PW);
const { spawnSync } = require('child_process');
const S = process.env.S, BASE = process.env.BASE;
const api = require('./api.cjs')(S + '/admin.json');
const state = require('./pruebas-state.cjs')(api);
const pause = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const AXE = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } };
const SP = state.SPACE;
const NEW_RESTAURANT = 'Zz Prueba Alta';

const spacesOf = async () => (await api('GET', '/restaurants/pruebas/spaces')).body.spaces.sort((a, b) => a.order - b.order);
const cleanup = async (original) => {
  // Lo que no es el espacio de siempre, fuera; y este, principal y primero.
  for (const s of await spacesOf()) if (s.id !== SP) await api('DELETE', `/restaurants/pruebas/spaces/${s.id}`);
  await api('PATCH', `/restaurants/pruebas/spaces/${SP}`, { isDefault: true, order: original.order });
  await api('PATCH', '/restaurants/pruebas', { activeLocaleCodes: original.locales, defaultLocaleCode: original.defaultLocale });
  const list = (await api('GET', '/restaurants')).body.restaurants;
  if (list.some(r => r.slug === 'zz-prueba-alta')) await api('DELETE', '/restaurants/zz-prueba-alta');
};

(async () => {
  const r0 = (await api('GET', '/restaurants/pruebas')).body.restaurant;
  const original = { order: (await spacesOf()).find(s => s.id === SP).order, locales: r0.activeLocales, defaultLocale: r0.defaultLocale };
  await cleanup(original);
  const before = await state.read();
  const browser = await chromium.launch();
  const audit = async (p, name, root = 'main') => {
    await p.waitForFunction(() => !document.querySelector('[data-sonner-toast]'), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400);
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await p.evaluate(async ({ AXE, root }) => {
      const r = await axe.run(document, AXE);
      const scope = [...document.querySelectorAll(root)].pop() ?? document.body;
      const visible = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const controls = [...scope.querySelectorAll('button, a[href], input, select, textarea, [role=tab]')].filter(visible);
      const small = controls.filter(e => { if (e.matches('input[type=checkbox], input[type=radio], input[type=file]')) e = e.closest('label') ?? e; const b = e.getBoundingClientRect(); return b.height < 24 || b.width < 24; }).map(e => (e.getAttribute('aria-label') || e.id || e.textContent || e.tagName).trim().slice(0, 40));
      const noPointer = controls.filter(e => e.matches('button:not(:disabled), a[href], [role=tab], select:not(:disabled)') && getComputedStyle(e).cursor !== 'pointer').map(e => (e.getAttribute('aria-label') || e.id || e.textContent).trim().slice(0, 40));
      return { v: r.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' ; ')), small, noPointer, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
    }, { AXE, root });
    const n = res.v.length + res.small.length + res.noPointer.length + (res.overflow ? 1 : 0);
    check(`auditoría: ${name}`, n === 0, res);
  };
  try {
    const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const dialog = p.getByRole('dialog');
    const spaces = p.locator('section', { has: p.getByRole('heading', { name: 'Espacios', exact: true }) });
    const row = (name) => spaces.getByRole('listitem').filter({ hasText: name });
    const active = () => p.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');

    console.log('— Entrada al restaurante');
    await p.goto(`${BASE}/restaurants/pruebas`);
    const menu = p.getByRole('navigation', { name: 'Secciones de la web' });
    await menu.waitFor();
    check('se entra por la carta, con el menú en tres grupos siempre abiertos', (await menu.getByRole('button', { name: /^Carta/ }).getAttribute('aria-current')) === 'page'
      && state.j(await menu.locator('[data-group]').allInnerTexts()) === state.j(['Cada semana', 'Tu web', 'Información']) && (await menu.locator('[aria-expanded]').count()) === 0, await menu.locator('[data-group]').allInnerTexts());
    await audit(p, 'carta del restaurante');
    await menu.getByRole('button', { name: /^Espacios/ }).click();
    check('cada sección se abre desde el menú', /s=spaces/.test(p.url()) && await p.getByRole('button', { name: 'Añadir espacio' }).isVisible(), p.url());
    await menu.getByRole('button', { name: /^Sobre nosotros/ }).click();
    check('cada bloque de contenido tiene su sección', await p.getByRole('heading', { level: 2, name: 'Sobre nosotros' }).isVisible() && !(await p.getByRole('heading', { level: 2, name: 'Preguntas frecuentes' }).count()));
    await audit(p, 'apartado sobre nosotros');
    await pause(5000);

    console.log('— Espacios');
    await p.goto(`${BASE}/restaurants/pruebas?s=spaces`);
    await spaces.getByRole('button', { name: 'Añadir espacio' }).waitFor();
    check('con un solo espacio no se ofrece ordenar, hacer principal ni eliminar', (await spaces.getByRole('button', { name: /^Más acciones/ }).count()) === 0 && await row('Comedor principal').getByRole('link', { name: 'Editar Comedor principal' }).isVisible());
    await audit(p, 'ficha con la lista de espacios');

    await spaces.getByRole('button', { name: 'Añadir espacio' }).click();
    await dialog.getByRole('heading', { name: 'Nuevo espacio' }).waitFor();
    check('avisa de que la web puede no enseñar un segundo espacio', await dialog.getByText(/tenía un solo espacio/).isVisible());
    await audit(p, 'espacio nuevo', '[role=dialog]');
    await dialog.getByRole('button', { name: 'Crear espacio' }).click();
    check('sin nombre no crea y lo dice', await dialog.getByText('Escribe el nombre del espacio.').isVisible());
    await dialog.locator('#sp-name').fill('Terraza de prueba');
    await dialog.locator('#sp-type').selectOption('terraza');
    await dialog.getByRole('button', { name: 'Crear espacio' }).click();
    await p.waitForURL(/s=cover&e=[a-z0-9]+$/, { timeout: 20000 });
    let list = await spacesOf();
    const created = list.find(s => s.name === 'Terraza de prueba');
    check('lo crea sin publicar, con su dirección propia, y abre su página', !!created && created.slug === 'terraza-de-prueba' && created.type === 'terraza' && !created.isDefault && created.state !== 'published', created);
    // Con dos espacios, el menú copia la web: la página de inicio, una página por espacio y lo del negocio aparte.
    const menuNav = p.getByRole('navigation', { name: 'Secciones de la web' });
    await p.getByRole('heading', { level: 2, name: 'Terraza de prueba' }).waitFor();
    check('con varios espacios, el menú son las páginas de la web y el negocio', state.j(await menuNav.locator('[data-group]').allInnerTexts()) === state.j(['Páginas de tu web', 'Tu negocio'])
      && state.j(await menuNav.locator('ul').first().getByRole('button').allInnerTexts()) === state.j(['Página de inicio', 'Comedor principal', 'Terraza de prueba']), await menuNav.innerText());
    const parts = p.getByRole('navigation', { name: 'Partes de Terraza de prueba' });
    check('la página del espacio abre en Portada, con sus partes en pestañas', state.j(await parts.getByRole('button').allInnerTexts()) === state.j(['Carta', 'Horario', 'Portada', 'Galería de fotos', 'Nombre'])
      && (await parts.getByRole('button', { name: 'Portada' }).getAttribute('aria-current')) === 'page'
      && (await menuNav.getByRole('button', { name: 'Terraza de prueba' }).getAttribute('aria-current')) === 'page', await parts.innerText());
    await parts.getByRole('button', { name: 'Nombre' }).click();
    await p.getByRole('heading', { name: 'Nombre de «Terraza de prueba»' }).waitFor();
    check('el nombre se cambia en la página del espacio', /s=spacename/.test(p.url()) && p.url().includes(created.id));
    await menuNav.getByRole('button', { name: 'Comedor principal' }).click();
    await p.getByRole('heading', { level: 2, name: 'Comedor principal' }).waitFor();
    check('pasar a otro espacio se queda en la misma parte', /s=spacename/.test(p.url()) && !p.url().includes(created.id)
      && (await p.getByRole('navigation', { name: 'Partes de Comedor principal' }).getByRole('button', { name: 'Nombre' }).getAttribute('aria-current')) === 'page');
    await menuNav.getByRole('button', { name: 'Página de inicio' }).click();
    const homeParts = p.getByRole('navigation', { name: 'Partes de Página de inicio' });
    await homeParts.waitFor();
    check('la página de inicio lleva lo común en pestañas', state.j(await homeParts.getByRole('button').allInnerTexts()) === state.j(['Bloques destacados', 'Sobre nosotros', 'Grupos y eventos', 'Preguntas frecuentes']));
    await menuNav.getByRole('button', { name: 'Contacto y reservas' }).click();
    await p.getByRole('heading', { level: 2, name: 'Contacto y reservas' }).waitFor();
    check('lo del negocio no lleva pestañas', (await p.getByRole('navigation', { name: /^Partes de/ }).count()) === 0);
    await menuNav.getByRole('button', { name: 'Terraza de prueba' }).click();
    await p.waitForURL(new RegExp(`e=${created.id}`));
    await audit(p, 'portada de un segundo espacio');
    await menuNav.getByRole('button', { name: /^Espacios/ }).click();
    await row('Terraza de prueba').waitFor();
    check('la lista enseña el tipo y cuál es el principal', /Terraza/.test(await row('Terraza de prueba').innerText()) && /Principal/.test(await row('Comedor principal').innerText()));
    check('con varios espacios, Espacios solo tiene la lista', (await p.getByRole('heading', { name: /^Nombre de «/ }).count()) === 0);
    await audit(p, 'ficha con dos espacios');
    // Ordenar, cambiar el principal y eliminar van en el menú «⋯» de cada fila.
    const rowAction = async (space, action) => {
      await spaces.getByRole('button', { name: `Más acciones: ${space}` }).click();
      await p.getByRole('menuitem', { name: action, exact: true }).click();
    };
    await rowAction('Terraza de prueba', 'Subir');
    await p.waitForTimeout(2500);
    list = await spacesOf();
    check('subir un espacio cambia el orden y se guarda', list[0].id === created.id && (await spaces.getByRole('listitem').first().innerText()).includes('Terraza de prueba'), list.map(s => s.name));
    check('el foco vuelve al menú de la fila movida', /^Más acciones: Terraza de prueba$/.test(await active()), await active());
    await rowAction('Terraza de prueba', 'Hacer principal');
    await p.getByText('Espacio principal cambiado', { exact: true }).first().waitFor();
    list = await spacesOf();
    check('hacer principal lo cambia y solo queda uno', list.find(s => s.id === created.id).isDefault && list.filter(s => s.isDefault).length === 1, list.map(s => [s.name, s.isDefault]));
    await rowAction('Comedor principal', 'Hacer principal');
    await p.waitForTimeout(1500);
    await rowAction('Terraza de prueba', 'Eliminar');
    await dialog.getByText(/toda su carta/).waitFor();
    await audit(p, 'confirmar la eliminación de un espacio', '[role=dialog]');
    await p.getByRole('button', { name: 'Sí, eliminar' }).click();
    await p.getByText('Espacio eliminado', { exact: true }).first().waitFor();
    list = await spacesOf();
    check('eliminar lo quita y el de siempre sigue siendo el principal', list.length === 1 && list[0].id === SP && list[0].isDefault, list.map(s => [s.name, s.isDefault]));
    await pause(15000);

    console.log('— Idiomas de la web');
    const aside = p.locator('main');
    await p.goto(`${BASE}/restaurants/pruebas?s=languages`);
    await aside.getByRole('button', { name: 'Cambiar idiomas' }).click();
    await dialog.getByRole('heading', { name: 'Idiomas de la web' }).waitFor();
    check('sin cambios no se puede guardar', await dialog.getByRole('button', { name: 'Guardar idiomas' }).isDisabled());
    await audit(p, 'idiomas de la web', '[role=dialog]');
    await dialog.getByLabel(/^English/).uncheck();
    check('al quitar un idioma explica qué pasa con sus páginas y sus textos', await dialog.getByText('Vas a quitar English.').isVisible() && await dialog.getByText(/se guardan por si lo vuelves a activar/).isVisible());
    await dialog.locator('#main-ca').check();
    await dialog.getByRole('button', { name: 'Guardar idiomas' }).click();
    await p.getByText('Idiomas guardados', { exact: true }).first().waitFor();
    let r = (await api('GET', '/restaurants/pruebas')).body.restaurant;
    check('guarda los idiomas y el principal', state.j([...r.activeLocales].sort()) === '["ca","es"]' && r.defaultLocale === 'ca', [r.activeLocales, r.defaultLocale]);
    await p.waitForTimeout(800);
    check('la ficha lo refleja: lista de idiomas y campos', /Català\s*Principal/.test(await aside.innerText()) && !/English/.test(await aside.getByRole('region', { name: 'Idiomas de la web' }).innerText()));
    await aside.getByRole('button', { name: 'Cambiar idiomas' }).click();
    await dialog.getByLabel(/^English/).check();
    check('al añadir un idioma avisa de que habrá que traducir', await dialog.getByText('Vas a añadir English.').isVisible() && await dialog.getByText(/tendrás que traducir/).isVisible());
    await dialog.getByLabel(/^Español/).uncheck();
    await dialog.getByLabel(/^Català/).uncheck();
    await dialog.getByLabel(/^English/).uncheck();
    await dialog.getByRole('button', { name: 'Guardar idiomas' }).click();
    check('no deja la web sin idiomas', await dialog.getByRole('alert').filter({ hasText: 'al menos un idioma' }).isVisible());
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    // Con un cambio a medio guardar, «Cambiar idiomas» lo guarda antes de abrir.
    await menu.getByRole('button', { name: /^Contacto y reservas/ }).click();
    await p.locator('#r-founded').fill('1990');
    await menu.getByRole('button', { name: /^Idiomas/ }).click();
    await aside.getByRole('button', { name: 'Cambiar idiomas' }).click();
    await dialog.getByRole('heading', { name: 'Idiomas de la web' }).waitFor();
    r = (await api('GET', '/restaurants/pruebas')).body.restaurant;
    check('cambiar idiomas guarda antes lo pendiente', r.foundedYear === 1990, r.foundedYear);
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await api('PATCH', '/restaurants/pruebas', { activeLocaleCodes: original.locales, defaultLocaleCode: original.defaultLocale });
    await pause(10000);

    console.log('— Dirección de la web');
    await p.goto(`${BASE}/restaurants/pruebas?s=contact`);
    await p.locator('#r-domain').waitFor();
    await p.locator('#r-domain').fill('no es una web');
    await p.getByText(/Sin guardar/).waitFor({ timeout: 8000 });
    check('una dirección mal escrita se rechaza con ejemplo', await p.locator('#r-domain-error').isVisible() && /www\.mirestaurante\.com/.test(await p.locator('#r-domain-error').innerText()));
    await p.locator('#r-domain').fill('https://WWW.Pruebas-Nueva.example/');
    await p.getByText('Cambios guardados', { exact: true }).first().waitFor({ timeout: 10000 });
    r = (await api('GET', '/restaurants/pruebas')).body.restaurant;
    check('la guarda limpia, sin protocolo ni mayúsculas', r.domain === 'www.pruebas-nueva.example', r.domain);
    const ectx = await browser.newContext({ storageState: S + '/editor.json', viewport: { width: 1280, height: 900 } });
    const e = await ectx.newPage();
    await e.goto(`${BASE}/restaurants/pruebas?s=contact`);
    await e.locator('#r-name').waitFor();
    const noDomain = (await e.locator('#r-domain').count()) === 0;
    const enav = e.getByRole('navigation', { name: 'Secciones de la web' });
    await enav.getByRole('button', { name: /^Idiomas/ }).click();
    const canLanguages = await e.getByRole('button', { name: 'Cambiar idiomas' }).isVisible();
    await enav.getByRole('button', { name: /^Espacios/ }).click();
    check('un editor no ve la dirección de la web, y sí puede cambiar idiomas y añadir espacios', noDomain && canLanguages && await e.getByRole('button', { name: 'Añadir espacio' }).isVisible());
    await ectx.close();
    await pause(10000);

    console.log('— Secciones del espacio');
    await p.goto(`${BASE}/restaurants/pruebas?s=cover`);
    await menu.waitFor();
    check('la portada avisa en el menú de sus traducciones pendientes', /falta traducir 2 textos/.test(await menu.getByRole('button', { name: /^Portada/ }).innerText()));
    await menu.getByRole('button', { name: /^Horario/ }).click();
    check('el horario va en su sección, con sus textos plegados', /s=hours/.test(p.url()) && await p.getByRole('group', { name: 'Lunes' }).isVisible() && await p.getByText('Textos que acompañan al horario').isVisible());
    await audit(p, 'espacio: horario');
    await p.goto(`${BASE}/restaurants/pruebas?s=contact&e=${SP}`);
    // El contacto es uno solo, el del restaurante: el espacio ya no tiene el suyo.
    await p.locator('#r-email').waitFor();
    check('el espacio ya no pide otra dirección ni otro teléfono', (await p.locator('#s-email, #s-street').count()) === 0);
    check('se puede abrir directamente en una sección', await p.locator('#r-email').isVisible() && (await menu.getByRole('button', { name: /^Contacto y reservas/ }).getAttribute('aria-current')) === 'page');
    await audit(p, 'contacto y reservas');
    await p.locator('#r-email').fill('mal');
    await menu.getByRole('button', { name: /^Galería/ }).click();
    await p.getByText(/Sin guardar/).waitFor({ timeout: 8000 });
    await audit(p, 'galería');
    check('un error en otra sección se cuenta en el menú', /1 campo por corregir/.test(await menu.getByRole('button', { name: /^Contacto y reservas/ }).innerText()));
    await p.getByRole('button', { name: 'Ir al campo' }).click();
    await p.waitForTimeout(500);
    check('«Ir al campo» lleva hasta él', /s=contact/.test(p.url()) && (await p.evaluate(() => document.activeElement?.id)) === 'r-email');
    await p.locator('#r-email').fill('');
    await p.getByText('Cambios guardados', { exact: true }).first().waitFor({ timeout: 10000 });
    await ctx.close();
    await pause(15000);

    console.log('— Móvil');
    const mctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const m = await mctx.newPage();
    await m.goto(`${BASE}/restaurants/pruebas`);
    const picker = m.getByLabel('Sección', { exact: true });
    await picker.waitFor();
    check('en móvil las secciones se eligen en un desplegable, con los mismos grupos', !(await m.getByRole('navigation', { name: 'Secciones de la web' }).isVisible())
      && state.j(await picker.locator('optgroup').evaluateAll(g => g.map(x => x.label))) === state.j(['Cada semana', 'Tu web', 'Información']));
    await audit(m, 'resumen en móvil');
    await picker.selectOption('spaces');
    check('elegir una sección la abre', await m.getByRole('button', { name: 'Añadir espacio' }).isVisible() && /s=spaces/.test(m.url()));
    await audit(m, 'espacios en móvil');
    await m.getByRole('button', { name: 'Añadir espacio' }).click();
    await audit(m, 'espacio nuevo en móvil', '[role=dialog]');
    await m.keyboard.press('Escape');
    await picker.selectOption('languages');
    await m.getByRole('button', { name: 'Cambiar idiomas' }).click();
    await audit(m, 'idiomas en móvil', '[role=dialog]');
    await m.keyboard.press('Escape');
    await m.goto(`${BASE}/restaurants/pruebas?s=hours`);
    await m.getByRole('group', { name: 'Lunes' }).waitFor();
    check('la acción de publicar, abajo y a mano', await m.getByRole('button', { name: 'Publicar la web' }).last().isVisible());
    await audit(m, 'horario en móvil');
    await mctx.close();
    await pause(15000);

    console.log('— Alta de restaurante');
    const actx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 1440, height: 900 } });
    const a = await actx.newPage();
    const adialog = a.getByRole('dialog');
    await a.goto(`${BASE}/restaurants`);
    await a.getByRole('button', { name: 'Añadir restaurante' }).click();
    await adialog.getByRole('heading', { name: 'Nuevo restaurante' }).waitFor();
    await audit(a, 'restaurante nuevo', '[role=dialog]');
    await adialog.locator('#nr-name').fill('Pruebas');
    await adialog.locator('#nr-domain').fill('www.zz-prueba.example');
    await adialog.getByRole('button', { name: 'Crear restaurante' }).click();
    check('un nombre que ya existe se avisa antes de enviar', await adialog.getByText(/Ya hay un restaurante con ese nombre/).isVisible());
    await adialog.locator('#nr-name').fill(NEW_RESTAURANT);
    await adialog.locator('#nr-domain').fill('sin punto');
    await adialog.getByRole('button', { name: 'Crear restaurante' }).click();
    check('una dirección mal escrita se rechaza', await adialog.getByText(/Escribe la dirección de la web/).isVisible());
    await adialog.locator('#nr-domain').fill('https://www.zz-prueba.example/');
    await adialog.getByLabel('Català').check();
    await adialog.getByRole('button', { name: 'Crear restaurante' }).click();
    await a.waitForURL(/\/restaurants\/zz-prueba-alta$/, { timeout: 20000 });
    await a.getByRole('heading', { level: 1, name: NEW_RESTAURANT }).waitFor();
    await a.getByRole('navigation', { name: 'Secciones de la web' }).waitFor();
    const made = (await api('GET', '/restaurants/zz-prueba-alta')).body.restaurant;
    check('lo crea con su dirección e idiomas y abre su ficha', made.domain === 'www.zz-prueba.example' && state.j([...made.activeLocales].sort()) === '["ca","es"]' && made.defaultLocale === 'es', [made.domain, made.activeLocales, made.defaultLocale]);
    await a.getByRole('navigation', { name: 'Secciones de la web' }).getByRole('button', { name: /^Portada/ }).click();
    const invites = await a.getByText('Aún no hay ningún espacio').isVisible();
    await a.getByRole('button', { name: 'Ir a Espacios' }).click();
    check('sin espacios, las secciones de espacio invitan a añadir el primero', invites && await a.getByText('Este restaurante aún no tiene espacios').isVisible() && await a.getByRole('button', { name: 'Añadir espacio' }).isVisible());
    await audit(a, 'ficha de un restaurante recién creado');
    const ed = await browser.newContext({ storageState: S + '/editor.json', viewport: { width: 1280, height: 900 } });
    const ep = await ed.newPage();
    await ep.goto(`${BASE}/restaurants`);
    await ep.waitForLoadState('networkidle');
    check('un editor no puede dar de alta restaurantes', (await ep.getByRole('button', { name: 'Añadir restaurante' }).count()) === 0);
    await ed.close();
    await actx.close();
    await pause(15000);

    console.log('— Herramienta ux-a11y-audit');
    const out = spawnSync('node', [process.env.HOME + '/.claude/tools/ux-a11y-audit.cjs', `--storage=${S}/admin.json`, `${BASE}/dashboard`, `${BASE}/restaurants`, `${BASE}/restaurants/pruebas`, `${BASE}/restaurants/pruebas?tab=spaces`, `${BASE}/restaurants/pruebas?tab=about`, `${BASE}/restaurants/pruebas/spaces/${SP}?tab=hours`], { encoding: 'utf8' });
    console.log((out.stdout + out.stderr).trim().split('\n').filter(l => /══|✗|Total/.test(l)).join('\n'));
    check('herramienta: 0 incidencias', out.status === 0);
  } catch (e) { fail++; console.log('EXCEPCIÓN', e.message.split('\n').slice(0, 4).join(' | ')); }
  finally {
    await browser.close();
    await cleanup(original);
    const diff = await state.restore(before);
    const list = await spacesOf();
    const r = (await api('GET', '/restaurants/pruebas')).body.restaurant;
    const gone = !(await api('GET', '/restaurants')).body.restaurants.some(x => x.slug === 'zz-prueba-alta');
    const ok = diff.length === 0 && list.length === 1 && list[0].isDefault && r.defaultLocale === original.defaultLocale && state.j([...r.activeLocales].sort()) === state.j([...original.locales].sort()) && gone;
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff), '· espacios:', list.length, '· idiomas:', r.activeLocales.join(','), r.defaultLocale, '· restaurante de prueba borrado:', gone);
    if (!ok) fail++;
    await state.pool.end();
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
