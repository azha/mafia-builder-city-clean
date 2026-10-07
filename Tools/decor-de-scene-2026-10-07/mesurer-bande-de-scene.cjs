const pw = require('/home/erutheone/project/mafia-clean-city/node_modules/playwright-core');
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 2600 } });
  await p.goto('file:///home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html', { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(1500);
  const idxs = JSON.parse(process.argv[2]);
  const out = await p.evaluate((idxs) => idxs.map(i => {
    const c = document.querySelectorAll('.cadre')[i]; const tel = c.querySelector('.tel'); const tr = tel.getBoundingClientRect();
    const pn = tel.querySelector('.panneau'); const pr = pn ? pn.getBoundingClientRect() : null;
    const sc = tel.querySelector('.scene'); const scs = sc ? getComputedStyle(sc) : null;
    return { i, telH: Math.round(tr.height), panneauTop: pr ? Math.round(pr.top - tr.top) : null, panneauH: pr ? Math.round(pr.height) : null,
             sceneVisiblePct: pr ? Math.max(0, Math.round(100 * (pr.top - tr.top) / tr.height)) : 100, sceneOpacity: scs ? scs.opacity : null, sceneFilter: scs ? scs.filter : null };
  }), idxs);
  console.log(JSON.stringify(out));
  await b.close();
})();
