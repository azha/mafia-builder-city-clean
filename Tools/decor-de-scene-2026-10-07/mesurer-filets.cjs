// Mesure les FILETS et BORDS de chaque cadre nominal de la maquette série 6 (Chromium, styles calculés) : un élément = une entrée si l'un de ses 4 côtés a
// une épaisseur >= 1 px, un style visible (solid/dotted/dashed/double) et une couleur non transparente. Usage : node mesurer-filets.cjs '[idx…]' > mesure-filets.json
const pw = require('/home/erutheone/project/mafia-clean-city/node_modules/playwright-core');
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 2600 } });
  await p.goto('file:///home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html', { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(1500);
  const out = await p.evaluate((idxs) => idxs.map(i => {
    const c = document.querySelectorAll('.cadre')[i]; const tel = c.querySelector('.tel'); const res = [];
    const hex = s => { const m = s.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/); if (!m) return s; const a = m[4] === undefined ? 1 : +m[4]; return '#' + [1,2,3].map(k => (+m[k]).toString(16).padStart(2,'0')).join('') + (a < 1 ? '@' + a : ''); };
    tel.querySelectorAll('.ecran *').forEach(el => {
      const cs = getComputedStyle(el); const cotes = [];
      ['Top','Right','Bottom','Left'].forEach(s => {
        const w = parseFloat(cs['border' + s + 'Width']), st = cs['border' + s + 'Style'], col = cs['border' + s + 'Color'];
        if (w >= 0.99 && st !== 'none' && st !== 'hidden' && !/rgba\(0, 0, 0, 0\)/.test(col)) cotes.push({ c: s[0], w: Math.round(w * 10) / 10, st, col: hex(col) });
      });
      if (cotes.length) res.push({ cls: [...el.classList].join('.') || el.tagName.toLowerCase(), cotes, rayon: cs.borderTopLeftRadius });
    });
    return { i, n: res.length, el: res };
  }), JSON.parse(process.argv[2]));
  console.log(JSON.stringify(out));
  await b.close();
})();
