#!/usr/bin/env python3
"""Garde d'amendement (2026-09-06, f2) : dans tout dossier de juge, aucune CAPTURE (capture*/planche*/temoin*) ne doit être un
lien symbolique, et chaque dossier qui porte des captures doit porter `captures-provenance.md`. Exit 1 sinon. Contrôle positif
intégré : un lien synthétique dans un répertoire temporaire DOIT être détecté."""
import sys, pathlib, tempfile, os
PREF=('capture','planche','temoin')
def balayer(racines):
    ko=[]; nb=0
    for r in racines:
        for p in pathlib.Path(r).rglob('*.png'):
            if not p.name.lower().startswith(PREF) or '/mesures/' in p.as_posix(): continue
            nb+=1
            if p.is_symlink(): ko.append(f"LIEN : {p}")
            elif not (p.parent/'captures-provenance.md').exists(): ko.append(f"SANS provenance : {p}")
    return nb, ko
with tempfile.TemporaryDirectory() as t:
    (pathlib.Path(t)/'x.png').write_bytes(b'x'); os.symlink('x.png', pathlib.Path(t)/'capture-test.png')
    n,k=balayer([t]); assert n==1 and k and k[0].startswith('LIEN'), "contrôle positif cassé"
racines=sys.argv[1:] or ['Tools/juge-visuel','Tools/juge-donnees']
n,ko=balayer(racines)
print(f"{n} capture(s) balayée(s) sous {racines} ; contrôle positif OK ; {len(ko)} défaut(s)")
for k in ko: print("  ⛔",k)
sys.exit(1 if ko else 0)
