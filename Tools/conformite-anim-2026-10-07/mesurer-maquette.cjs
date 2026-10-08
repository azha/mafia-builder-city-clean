// Mesure les animations CSS d'une maquette de l'atelier DANS CHROMIUM (document.getAnimations), par cadre.
// Usage : node mesurer-maquette.cjs <chemin.html> <sortie.json> [chemin/vers/playwright-core]
// Une animation « paused » (gel du ruling 27/08 13h42) est comptée MAIS marquée : voir le champ state.
const fs = require('fs');
const pw = require(process.argv[4] || '/home/erutheone/project/mafia-clean-city/node_modules/playwright-core');
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 2400 } });
  await p.goto('file://' + process.argv[2], { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(1500);
  const out = await p.evaluate(() => {
    const cadres = [...document.querySelectorAll('.cadre')];
    const idx = el => { const c = el.closest('.cadre'); return c ? cadres.indexOf(c) : -1; };
    const rows = document.getAnimations().map(a => {
      const t = a.effect && a.effect.target; const tm = a.effect.getTiming();
      return { cadre: t ? idx(t) : -2, name: a.animationName || a.transitionProperty, dur: tm.duration,
               delay: tm.delay, iter: tm.iterations, state: a.playState };
    });
    return { ncadres: cadres.length, rows };
  });
  fs.writeFileSync(process.argv[3], JSON.stringify(out));
  console.log(process.argv[2].split('/').pop(), 'cadres', out.ncadres, 'animations', out.rows.length);
  await b.close();
})();
