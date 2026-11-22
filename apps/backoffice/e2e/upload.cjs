// Sube una foto de prueba a «pruebas». El archivo va a R2 con la URL firmada, como hace el
// navegador; si el punto de subida no responde desde esta máquina, se sube con wrangler
// (API de Cloudflare) a la misma clave, que para el api es equivalente.
const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const API_DIR = require('path').resolve(__dirname, '../../api');

module.exports = function (api, S) {
  const file = path.join(S, 'img', 'pequena.jpg');
  const bytes = fs.readFileSync(file);
  let direct = true;
  return async function upload(name, altText, size = { width: 1200, height: 900 }) {
    const u = await api('POST', '/media/upload-url', { restaurantSlug: 'pruebas', filename: name + '.jpg', mimeType: 'image/jpeg', sizeKb: Math.max(1, Math.round(bytes.length / 1024)) });
    if (u.status !== 200) throw new Error('upload-url ' + JSON.stringify(u.body));
    if (direct) {
      try {
        const r = await fetch(u.body.uploadUrl, { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: bytes, signal: AbortSignal.timeout(8000) });
        if (!r.ok) throw new Error('PUT ' + r.status);
      } catch { direct = false; console.log('   (R2 no responde a la URL firmada: se sube con wrangler)'); }
    }
    if (!direct) {
      execFileSync('pnpm', ['exec', 'wrangler', 'r2', 'object', 'put', `hostelery/${u.body.r2Key}`, '--file', file, '--content-type', 'image/jpeg', '--remote'], { cwd: API_DIR, stdio: 'pipe' });
    }
    const c = await api('POST', `/media/${u.body.mediaId}/confirm`, { ...size, altText });
    if (c.status !== 200) throw new Error('confirm ' + JSON.stringify(c.body));
    return u.body.mediaId;
  };
};
