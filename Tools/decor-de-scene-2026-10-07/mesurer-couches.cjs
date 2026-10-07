const pw = require('/home/erutheone/project/mafia-clean-city/node_modules/playwright-core');
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 2600 } });
  await p.goto('file:///home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html', { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(1500);
  const out = await p.evaluate(() => {
    const kinds = bi => { if (!bi || bi === 'none') return ''; const k = []; if (/feTurbulence/.test(bi)) k.push('bruit'); else if (/url\(/.test(bi)) k.push('image'); if (/radial/.test(bi)) k.push('radial'); if (/(^|[^-])linear-gradient/.test(bi)) k.push('lin'); if (/repeating/.test(bi)) k.push('rayures'); return k.join('+'); };
    return [...document.querySelectorAll('.cadre')].map((c, i) => {
      const tel = c.querySelector('.tel'); const et = ((c.querySelector('.etiquette') || {}).textContent || '').trim();
      const r = { i, et, scene: null, voile: null, filtre: null, couches: {}, matieres: {} };
      if (!tel) return r;
      const sc = tel.querySelector('.scene');
      if (sc) { r.scene = [...sc.classList].filter(x => x !== 'scene').join('.') || '(sans nom)'; const cs = getComputedStyle(sc); r.filtre = cs.filter; }
      const vs = tel.querySelector('.voile-scene'); if (vs) r.voile = kinds(getComputedStyle(vs).backgroundImage);
      tel.querySelectorAll('.ecran *').forEach(el => {
        const cs = getComputedStyle(el); const k = kinds(cs.backgroundImage);
        const cl = [...el.classList].join('.');
        if (k) { const key = (cl || el.tagName.toLowerCase()) + ':' + k; r.couches[key] = (r.couches[key] || 0) + 1; }
        if (/\bpanneau\b/.test(cl)) { const m = [...el.classList].filter(x => x !== 'panneau').join('.') || 'panneau'; r.matieres[m] = (r.matieres[m] || 0) + 1; }
        if (cs.boxShadow !== 'none' && /inset/.test(cs.boxShadow)) r.couches['(ombre-interne)'] = (r.couches['(ombre-interne)'] || 0) + 1;
        if (/\bhalo\b/.test(cl)) r.couches['halo'] = (r.couches['halo'] || 0) + 1;
      });
      return r;
    });
  });
  require('fs').writeFileSync(process.argv[2], JSON.stringify(out));
  console.log(out.length);
  await b.close();
})();
