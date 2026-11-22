// Lanzador de las pruebas de navegador: prepara las rutas y ejecuta la prueba pedida.
//
//   pnpm e2e                      lista las pruebas
//   pnpm e2e <prueba>             ejecuta una (p. ej. `pnpm e2e drinks`)
//   pnpm e2e login <email> <contraseña> <admin|editor>   guarda una sesión
//   pnpm e2e fixtures             genera las fotos de prueba
//   pnpm e2e reset                deja «pruebas» sin fotos
//
// Ver README.md: las pruebas van contra la base de datos de producción, sobre el
// restaurante «pruebas», y cada una restaura lo que toca.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORK = path.join(__dirname, '.work');
const TOOLS = ['login', 'fixtures', 'reset'];
const HELPERS = ['api', 'pruebas-state', 'upload', 'run'];
const tests = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.cjs'))
  .map(f => f.replace(/\.cjs$/, ''))
  .filter(n => !TOOLS.includes(n) && !HELPERS.includes(n));

const [name, ...rest] = process.argv.slice(2);
if (!name || (!tests.includes(name) && !TOOLS.includes(name))) {
  console.log(`Pruebas: ${tests.join(', ')}\nUtilidades: ${TOOLS.join(', ')}\nUso: pnpm e2e <nombre>`);
  process.exit(name ? 1 : 0);
}

fs.mkdirSync(WORK, { recursive: true });
let args = rest;
if (name === 'login') {
  const [email, password, role] = rest;
  if (!email || !password || !['admin', 'editor'].includes(role)) {
    console.error('Uso: pnpm e2e login <email> <contraseña> <admin|editor>');
    process.exit(1);
  }
  args = [email, password, path.join(WORK, `${role}.json`)];
} else if (!fs.existsSync(path.join(WORK, 'admin.json'))) {
  console.error('Falta la sesión de administrador. Créala con: pnpm e2e login <email> <contraseña> admin');
  process.exit(1);
}

const result = spawnSync('node', [path.join(__dirname, `${name}.cjs`), ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    S: WORK,
    PW: require.resolve('playwright'),
    BASE: process.env.BASE || 'http://localhost:4400',
    API: process.env.API || 'http://localhost:8788'
  }
});
process.exit(result.status ?? 1);
