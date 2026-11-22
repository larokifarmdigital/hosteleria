// Genera las fotos de prueba (no van al repositorio: algunas pesan más de 10 MB).
const { chromium } = require(process.env.PW);
const fs = require('fs'); const path = require('path');
(async () => {
  const out = process.argv[2] || path.join(process.env.S, 'img');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage();
  const make = (w, h, type, q, noise, hue) => p.evaluate(async ([w, h, type, q, noise, hue]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    if (noise) { const d = x.createImageData(w, h); for (let i = 0; i < d.data.length; i += 65536) crypto.getRandomValues(d.data.subarray(i, Math.min(i + 65536, d.data.length))); for (let i = 3; i < d.data.length; i += 4) d.data[i] = 255; x.putImageData(d, 0, 0); }
    else { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${hue} 60% 55%)`); g.addColorStop(1, `hsl(${hue + 40} 50% 25%)`); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = `${Math.round(h / 8)}px sans-serif`; x.fillText(`${w}x${h}`, w / 10, h / 2); }
    const blob = await new Promise(r => c.toBlob(r, type, q));
    const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode(...buf.subarray(i, i + 32768)); return btoa(s);
  }, [w, h, type, q, noise, hue]);
  const save = async (name, ...a) => { fs.writeFileSync(path.join(out, name), Buffer.from(await make(...a), 'base64')); };
  await save('buena.jpg', 1800, 1200, 'image/jpeg', 0.85, false, 20);
  await save('plato.jpg', 1000, 1000, 'image/jpeg', 0.85, false, 110);
  await save('pequena.jpg', 600, 400, 'image/jpeg', 0.85, false, 220);
  await save('pesada.jpg', 1900, 1400, 'image/jpeg', 1, true, 0);
  await save('enorme.png', 2100, 2000, 'image/png', 1, true, 0);
  fs.writeFileSync(path.join(out, 'documento.pdf'), '%PDF-1.4 prueba');
  // Más de 10 MB que el navegador no sabe reducir: no es una imagen de verdad.
  fs.writeFileSync(path.join(out, 'irreducible.gif'), require('crypto').randomBytes(11 * 1024 * 1024));
  console.log('Fotos de prueba en', out);
  await b.close();
})();
