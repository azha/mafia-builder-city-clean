// Mesure, pour chaque cadre donné, la boîte de l'élément racine de support (premier enfant de .panneau) et son dégradé radial éventuel
// (revue n°4 B1 : le rayon d'un `circle farthest-corner` dépend de la boîte, qui change d'un cadre à l'autre). Usage : node mesurer-cercle.cjs '[31,32,…]'
const pw = require('/home/erutheone/project/mafia-clean-city/node_modules/playwright-core');
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 2600 } });
  await p.goto('file:///home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html', { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(1500);
  const out = await p.evaluate((idxs) => idxs.map(i => {
    const tel = document.querySelectorAll('.cadre')[i].querySelector('.tel'); const pn = tel.querySelector('.panneau') || tel;
    const root = pn.querySelector('.corkboard') || pn.children[0]; const r = root.getBoundingClientRect(); const cs = getComputedStyle(root);
    return { i, cls: [...root.classList].join('.'), w: +r.width.toFixed(2), h: +r.height.toFixed(2), bg: cs.backgroundImage.replace(/data:[^)]*\)/g, 'data)').slice(0, 200) };
  }), JSON.parse(process.argv[2]));
  console.log(JSON.stringify(out)); await b.close();
})();
