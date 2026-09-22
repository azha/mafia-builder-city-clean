#!/usr/bin/env python3
"""TD-576 (ii) — les `GameObject.Find("nom")` dont le résultat nourrit une assertion, dans Assets/Tests. Heuristique : une
assignation `var|GameObject|Transform x = GameObject.Find("…")`, et `x` (ou une variable tirée de x) lue par un `Assert.*` de la
même méthode. Usage : python3 Tools/juge-donnees/creneau-2026-09-22/find-nourrit-assertion.py (depuis la racine)."""
import re,pathlib,sys
# Chaque `GameObject.Find("nom")` dont le résultat est ASSIGNÉ à une variable, et où cette variable est ensuite lue
# par une assertion (directement, ou via une grandeur tirée d'elle) dans la même méthode.
rows=[]
for p in sorted(pathlib.Path('Assets/Tests').rglob('*.cs')):
    s=p.read_text(encoding='utf-8',errors='replace')
    s2=re.sub(r'("(?:\\.|[^"\\\n])*")|//[^\n]*', lambda m: m.group(1) or ' '*len(m.group(0)), s)
    for m in re.finditer(r'(?:var|GameObject|Transform)\s+(\w+)\s*=\s*GameObject\.Find\(\s*"([^"]+)"\s*\)',s2):
        v,nom=m.group(1),m.group(2); ln=s2.count('\n',0,m.start())+1
        # fin de méthode : prochaine accolade fermante à indentation 8
        f=s2.find('\n        }\n',m.end()); corps=s2[m.end(): f if f>0 else len(s2)]
        # variables dérivées de v (une génération)
        der={v}|set(re.findall(rf'(?:var|\w+)\s+(\w+)\s*=\s*[^;]*\b{v}\b[^;]*;',corps))
        nourrit=any(re.search(rf'Assert\.\w+\([^;]*\b{d}\b',corps,re.S) for d in der)
        rows.append((str(p),ln,v,nom,nourrit))
alim=[r for r in rows if r[4]]
print(f"{len(rows)} GameObject.Find assignés · {len(alim)} nourrissent une assertion · {len(set(r[0] for r in alim))} fichiers")
for r in alim: print(f"{r[0].split('/')[-1]}:{r[1]}\t{r[3]}\t({r[2]})")
