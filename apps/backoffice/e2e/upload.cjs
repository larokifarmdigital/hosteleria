// Sube una foto de prueba a «pruebas». El archivo va a R2 con la URL firmada, como hace el
// navegador: si R2 no responde desde esta máquina, la prueba no se puede pasar.
const fs = require('fs'); const path = require('path');

module.exports = function (api, S) {
  const file = path.join(S, 'img', 'pequena.jpg');
  const bytes = fs.readFileSync(file);
  return async function upload(name, altText, size = { width: 1200, height: 900 }) {
    const u = await api('POST', '/media/upload-url', { restaurantSlug: 'pruebas', filename: name + '.jpg', mimeType: 'image/jpeg', sizeKb: Math.max(1, Math.round(bytes.length / 1024)) });
    if (u.status !== 200) throw new Error('upload-url ' + JSON.stringify(u.body));
    let r;
    try {
      r = await fetch(u.body.uploadUrl, { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: bytes, signal: AbortSignal.timeout(8000) });
    } catch (e) { throw new Error('R2 no responde a la URL firmada desde esta máquina (' + e.message + ')'); }
    if (!r.ok) throw new Error('PUT a R2 ' + r.status);
    const c = await api('POST', `/media/${u.body.mediaId}/confirm`, { ...size, altText });
    if (c.status !== 200) throw new Error('confirm ' + JSON.stringify(c.body));
    return u.body.mediaId;
  };
};
