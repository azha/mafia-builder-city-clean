const pw = require('/home/erutheone/project/mafia-clean-city/node_modules/playwright-core');
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 2600 } });
  await p.goto('file:///home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html', { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(1500);
  const noms = JSON.parse(process.argv[2]);
  const out = await p.evaluate((idxs) => idxs.map(i => {
    const c = document.querySelectorAll('.cadre')[i]; const tel = c.querySelector('.tel');
    const ec = tel.querySelector('.ecran'); const kids = [...ec.children].map(k => ({ cls: [...k.classList].join('.'), tag: k.tagName.toLowerCase() }));
    // racine d'écran = enfant de .ecran dont la classe finit par 6 ou 'panneau'
    const pn = ec.querySelector('.panneau') || ec; const root = [...pn.children].find(k => /6$/.test([...k.classList].join(' ').trim().split(' ')[0])) || pn.children[0] || pn;
    const cs = getComputedStyle(root);
    const bi = cs.backgroundImage.replace(/data:[^)]*\)/g, 'data)').slice(0, 520);
    const cerne = !!root.querySelector('.cerne');
    const cc = cerne ? getComputedStyle(root.querySelector('.cerne')) : null;
    const ens = root.querySelector('.enseigne');
    const opaque = !/rgba?\(0, 0, 0, 0\)/.test(cs.backgroundColor) || /linear-gradient\((?!.*rgba)/.test(cs.backgroundImage);
    return { i, rootCls: [...root.classList].join('.'), bg: bi, bgColor: cs.backgroundColor, cerne, cerneBorder: cc ? cc.border : null, cerneShadow: cc ? cc.boxShadow.slice(0, 120) : null, enseigne: !!ens, kids: kids.map(k => k.cls || k.tag).join(' | ') };
  }), noms);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
