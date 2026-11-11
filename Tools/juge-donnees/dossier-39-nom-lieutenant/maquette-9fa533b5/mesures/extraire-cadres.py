#!/usr/bin/env python3
"""Extrait des cadres de la page de l'atelier par la convention de Tools/juge-visuel/verifier-indices-cadres.py :
indice = position 0-based du littéral exact `<div class="cadre">`."""
import re, sys, pathlib

page = pathlib.Path(sys.argv[1])
want = [int(x) for x in sys.argv[2:]]
h = page.read_text(encoding='utf-8', errors='replace')
starts = [m.start() for m in re.finditer(r'<div class="cadre">', h)]
print('TOTAL CADRES (littéral exact) = %d' % len(starts))
for i in want:
    if i >= len(starts):
        print('!! cadre %d au-delà des %d cadres' % (i, len(starts)))
        continue
    deb = starts[i]
    fin = starts[i + 1] if i + 1 < len(starts) else len(h)
    bloc = h[deb:fin]
    e = re.match(r'<div class="cadre">\s*<div class="etiquette">(.*?)</div>', bloc, re.S)
    print('\n===== CADRE %d — étiquette : %s =====' % (i, re.sub(r'\s+', ' ', e.group(1)).strip() if e else '(sans)'))
    print('longueur du bloc : %d octets' % len(bloc.encode('utf-8')))
    (page.parent / ('cadre-%d.html' % i)).write_text(bloc, encoding='utf-8')
    print('écrit : %s' % (page.parent / ('cadre-%d.html' % i)))
