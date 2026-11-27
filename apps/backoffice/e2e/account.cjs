// Entrega 2: cabecera con el avatar y su menú, y «Mi cuenta» (nombre y contraseña).
// Cambia el nombre del gestor de prueba y lo deja como estaba. No cambia ninguna contraseña:
// solo prueba los errores (una contraseña actual mala cuenta para el tope de 5 por hora).
const { chromium } = require(process.env.PW);
const S = process.env.S, BASE = process.env.BASE;
const adminApi = require('./api.cjs')(S + '/admin.json');
const editorApi = require('./api.cjs')(S + '/editor.json');
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const AXE = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } };

(async () => {
  const me = (await editorApi('GET', '/auth/session')).body.user;
  const browser = await chromium.launch();
  const audit = async (p, name) => {
    await p.waitForTimeout(400);
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await p.evaluate(async ({ AXE }) => {
      const r = await axe.run(document, AXE);
      const visible = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const controls = [...document.querySelectorAll('header button, header a[href], aside button, aside a[href], [role=menu] [role=menuitem], main button, main a[href], main input')].filter(visible);
      const small = controls.filter(e => { const b = e.getBoundingClientRect(); return b.height < 24 || b.width < 24; }).map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 40));
      const noPointer = controls.filter(e => e.matches('button:not(:disabled), a[href], [role=menuitem]:not([data-disabled])') && getComputedStyle(e).cursor !== 'pointer').map(e => (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 40));
      return { v: r.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' ; ')), small, noPointer, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
    }, { AXE });
    check(`auditoría: ${name}`, res.v.length + res.small.length + res.noPointer.length + (res.overflow ? 1 : 0) === 0, res);
  };
  try {
    console.log('— Api');
    check('sin sesión no se cambia nada', (await fetch(process.env.API + '/auth/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{"name":"x"}' })).status === 401);
    check('un nombre vacío no vale', (await editorApi('PATCH', '/auth/me', { name: '   ' })).status === 400);
    const wrong = await editorApi('POST', '/auth/password', { currentPassword: 'no-es-esta-1234', newPassword: 'otra cosa larga y rara 77' });
    check('con la contraseña actual mala no cambia y lo dice', wrong.status === 400 && wrong.body.code === 'WRONG_CURRENT_PASSWORD', wrong.body);
    check('la sesión sigue abierta tras el error', (await editorApi('GET', '/auth/session')).body.user?.id === me.id);

    console.log('— Escritorio (admin)');
    const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 1280, height: 860 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/dashboard`);
    const header = p.locator('header').first();
    const admin = (await adminApi('GET', '/auth/session')).body.user;
    const avatar = p.getByRole('button', { name: `Tu cuenta: ${admin.name}` });
    await avatar.waitFor();
    const sidebar = p.getByRole('complementary', { name: 'Menú de la aplicación' });
    check('barra lateral clara: inicio, restaurantes y administración; la cabecera solo lleva la cuenta', state(await sidebar.getByRole('navigation', { name: 'Principal' }).getByRole('link').allInnerTexts()) === state(['Inicio', 'Restaurantes', 'Administración'])
      && (await header.getByRole('link').count()) === 0);
    await sidebar.getByRole('button', { name: 'Plegar el menú' }).click();
    check('la barra se pliega a iconos y se puede volver a desplegar', await sidebar.getByRole('button', { name: 'Desplegar el menú' }).isVisible());
    await sidebar.getByRole('button', { name: 'Desplegar el menú' }).click();
    await audit(p, 'inicio con la cabecera');
    await avatar.click();
    const menu = p.getByRole('menu');
    await menu.waitFor();
    const items = await menu.getByRole('menuitem').allInnerTexts();
    check('el menú de la cuenta: mi cuenta, contraseña, ayuda y salir', state(items) === state(['Mi cuenta', 'Cambiar contraseña', 'Ayuda y soporte', 'Cerrar sesión']), items);
    await audit(p, 'menú de la cuenta abierto');
    await menu.getByRole('menuitem', { name: 'Ayuda y soporte' }).click();
    const help = p.getByRole('dialog', { name: 'Ayuda y soporte' });
    await help.waitFor();
    // Como en larokifarm: siempre el formulario (motivo y mensaje), con o sin clave de Web3Forms.
    check('ayuda y soporte abre el formulario: motivo, mensaje y enviar', await help.getByLabel('¿En qué te ayudamos?').isVisible() && await help.locator('#help-message').isVisible() && await help.getByRole('button', { name: 'Enviar' }).isVisible());
    await help.getByRole('button', { name: 'Enviar' }).click();
    check('sin mensaje no envía y lo dice', await help.getByText(/Cuéntanos qué pasa/).isVisible());
    await audit(p, 'ayuda y soporte', '[role=dialog]');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    await avatar.click();
    await menu.waitFor();
    // Tras un diálogo, Radix tarda unos milisegundos en registrar el menú nuevo.
    await p.waitForTimeout(300);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    check('Escape cierra el menú y el foco vuelve al avatar', (await p.getByRole('menu').count()) === 0 && await avatar.evaluate(e => e === document.activeElement));
    await avatar.click();
    await p.getByRole('menuitem', { name: 'Mi cuenta' }).click();
    await p.getByRole('heading', { level: 1, name: 'Mi cuenta' }).waitFor();
    check('mi cuenta enseña el email y el rol', await p.getByText(admin.email, { exact: true }).isVisible() && await p.getByText('Administrador', { exact: true }).isVisible());
    await audit(p, 'mi cuenta');
    await p.getByRole('button', { name: 'Cambiar contraseña' }).click();
    check('sin rellenar, dice qué falta', await p.getByText('Escribe tu contraseña actual.').isVisible() && await p.getByText('Escribe la contraseña nueva.').isVisible());
    await p.getByLabel('Contraseña nueva', { exact: false }).first().fill('una frase muy larga 88');
    await p.getByLabel('Repite la contraseña nueva').fill('otra distinta 88');
    await p.getByRole('button', { name: 'Cambiar contraseña' }).click();
    check('si no coinciden, lo dice', await p.getByText('No coincide con la contraseña nueva.').isVisible());
    await audit(p, 'mi cuenta con errores');
    await p.goto(`${BASE}/dashboard`);
    await avatar.click();
    await p.getByRole('menuitem', { name: 'Cambiar contraseña' }).click();
    await p.waitForURL(/\/account#contrasena$/);
    await p.waitForTimeout(400);
    check('cambiar contraseña lleva al campo de la contraseña actual', await p.evaluate(() => document.activeElement?.id) === 'account-current-password');
    await p.goto(`${BASE}/settings`);
    await p.getByRole('heading', { level: 1, name: 'Administración' }).waitFor();
    check('administración: título nuevo y marcada en la barra lateral', (await p.getByRole('complementary', { name: 'Menú de la aplicación' }).getByRole('link', { name: 'Administración' }).getAttribute('aria-current')) === 'page');
    await ctx.close();

    console.log('— Gestor: cambiar el nombre');
    const ectx = await browser.newContext({ storageState: S + '/editor.json', viewport: { width: 1280, height: 860 } });
    const e = await ectx.newPage();
    await e.goto(`${BASE}/account`);
    const name = e.getByLabel('Nombre', { exact: false }).first();
    await name.waitFor();
    check('un gestor no ve Administración', (await e.getByRole('link', { name: 'Administración' }).count()) === 0);
    await name.fill(`${me.name} prueba`);
    await e.getByRole('button', { name: 'Guardar nombre' }).click();
    await e.getByRole('button', { name: `Tu cuenta: ${me.name} prueba` }).waitFor({ timeout: 10000 });
    check('el nombre nuevo se guarda y sale en la cabecera', (await editorApi('GET', '/auth/session')).body.user.name === `${me.name} prueba`);
    await ectx.close();

    console.log('— Móvil');
    const mctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const m = await mctx.newPage();
    await m.goto(`${BASE}/restaurants/pruebas`);
    const mAvatar = m.getByRole('button', { name: `Tu cuenta: ${admin.name}` });
    await mAvatar.waitFor();
    check('en móvil no hay barra lateral ni enlaces en la cabecera', !(await m.getByRole('complementary', { name: 'Menú de la aplicación' }).isVisible()) && (await m.locator('header').getByRole('link').filter({ hasNotText: 'Hosteleria Studio' }).count()) === 0);
    await mAvatar.click();
    const mItems = await m.getByRole('menu').getByRole('menuitem').allInnerTexts();
    check('en móvil el menú de la cuenta lleva también a dónde ir', state(mItems) === state(['Inicio', 'Restaurantes', 'Administración', 'Mi cuenta', 'Cambiar contraseña', 'Ayuda y soporte', 'Cerrar sesión']), mItems);
    await audit(m, 'menú de la cuenta en móvil');
    await mctx.close();
  } catch (err) {
    check('excepción', false, String(err?.message ?? err).split('\n').slice(0, 3).join(' | '));
  } finally {
    const r = await editorApi('PATCH', '/auth/me', { name: me.name });
    console.log(`nombre del gestor restaurado: ${r.status === 200 && r.body.user.name === me.name}`);
    await browser.close();
    console.log(`${pass} correctas, ${fail} fallidas`);
    process.exit(fail ? 1 : 0);
  }
})();

function state(list) { return JSON.stringify(list.map(s => s.trim())); }
