// Recense, par machine, les `transition` DÉCLARÉES dans les feuilles de style d'une maquette (elles n'apparaissent
// pas dans document.getAnimations tant qu'on n'a pas basculé l'état). Usage : node recenser-transitions.cjs <html> <sortie.json>
const fs = require('fs');
const pw = require('/home/erutheone/project/mafia-clean-city/node_modules/playwright-core');
(async () => {
  const b = await pw.chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.argv[2], { waitUntil: 'load', timeout: 120000 });
  const out = await p.evaluate(() => {
    const res = [];
    const lire = rs => { for (const r of rs) {
      if (r.type === 1 && r.style) { const pr = r.style.getPropertyValue('transition-property'), du = r.style.getPropertyValue('transition-duration');
        if (pr && du && !/^(0s|0ms)(,\s*(0s|0ms))*$/.test(du)) res.push({ selecteur: r.selectorText.slice(0, 80), propriete: pr, duree: du }); }
      if (r.cssRules && r.type !== 7) lire(r.cssRules); } };
    for (const ss of document.styleSheets) { try { lire(ss.cssRules); } catch (e) {} }
    for (const el of document.querySelectorAll('[style*="transition"]')) { const m = /transition:\s*([\w-]+)\s+([\d.]+m?s)/.exec(el.getAttribute('style')); if (m) res.push({ selecteur: 'inline ' + el.tagName + '#' + (el.id || ''), propriete: m[1], duree: m[2] }); }
    return res;
  });
  fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
  console.log(process.argv[2].split('/').pop(), out.length, 'transitions déclarées'); await b.close();
})();
