// Oracle CSS : échantillonne, DANS CHROMIUM, la valeur calculée de chaque @keyframes appliqué d'une maquette,
// sur l'UNION de 17 points uniformes et de tous les pourcentages d'images clés (les coudes sont échantillonnés). Sert de vérité au test pur qui évalue Courbe.Evaluer côté Unity.
// Usage : node oracle-css.cjs <maquette.html> <sortie.json> [--etat=descente] [chemin/playwright-core]
// --etat=<classe> : classe posée sur .tel avant mesure (hud-brennar-canon : descente, jour, chaud).
const fs = require('fs');
const etat = (process.argv.find(a => a.startsWith('--etat=')) || '').slice(7);
const pw = require(process.argv.find(a => a.includes('playwright-core')) || '/home/erutheone/project/mafia-clean-city/node_modules/playwright-core');
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 2400 } });
  await p.goto('file://' + process.argv[2], { waitUntil: 'load', timeout: 120000 });
  if (etat) await p.evaluate(c => { const t = document.querySelector('.tel'); if (t) t.classList.add(c); }, etat);
  await p.waitForTimeout(800);
  const out = await p.evaluate(() => {
    const res = {};
    // Pourcentages d'images clés de chaque @keyframes (lus dans les feuilles de style) : les coudes sont échantillonnés.
    const coudes = {};
    const lire = rs => { for (const r of rs) { if (r.type === 7) { const o = new Set([0, 1]); for (const k of r.cssRules) for (const t of k.keyText.split(',')) o.add(parseFloat(t) / 100); coudes[r.name] = [...o]; } else if (r.cssRules && r.type !== 1) lire(r.cssRules); } };
    for (const ss of document.styleSheets) { try { lire(ss.cssRules); } catch (e) {} }
    for (const a of document.getAnimations()) {
      const name = a.animationName; if (!name || res[name]) continue;
      const el = a.effect.target; const tm = a.effect.getTiming();
      const dur = tm.duration; if (!(dur > 0)) continue;
      const ps = a.effect.pseudoElement || null; const cs0 = getComputedStyle(el, ps);
      const vars = {};
      for (const v of ['--mo', '--dx', '--chute', '--amp', '--dur', '--own']) { const x = cs0.getPropertyValue(v).trim(); if (x) vars[v] = x; }
      a.pause();
      a.effect.updateTiming({ delay: 0, endDelay: 0, iterations: 1, direction: 'normal', fill: 'both' });
      const samples = [];
      const grille = [...new Set([...Array.from({ length: 17 }, (_, i) => i / 16), ...(coudes[name] || [])])].sort((x, y) => x - y);
      for (const p of grille) {
        a.currentTime = dur * p;
        const cs = getComputedStyle(el, ps);
        const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
        const sx = Math.hypot(m.a, m.b), rot = Math.atan2(m.b, m.a) * 180 / Math.PI;
        const sy = sx ? (m.a * m.d - m.b * m.c) / sx : 0;
        const br = /brightness\(([-\d.]+)\)/.exec(cs.filter), hue = /hue-rotate\(([-\d.]+)deg\)/.exec(cs.filter);
        samples.push({ p, opacity: +cs.opacity, tx: m.e, ty: m.f, rot, sx, sy,
          brightness: br ? +br[1] : null, hue: hue ? +hue[1] : null,
          dash: cs.strokeDashoffset, shadow: cs.boxShadow === 'none' ? null : cs.boxShadow });
      }
      const kfs = a.effect.getKeyframes ? a.effect.getKeyframes().map(k => ({ offset: k.offset, easing: k.easing })) : [];
      res[name] = { durS: dur / 1000, easing: tm.easing, easing_cles: kfs, origin: cs0.transformOrigin, tag: el.tagName + (ps || ''), cls: (el.getAttribute('class') || '').slice(0, 40), vars, samples };
    }
    return res;
  });
  fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
  console.log(process.argv[2].split('/').pop(), Object.keys(out).length, 'keyframes échantillonnés :', Object.keys(out).join(' '));
  await b.close();
})();
