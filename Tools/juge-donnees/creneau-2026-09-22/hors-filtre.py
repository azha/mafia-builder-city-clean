#!/usr/bin/env python3
"""Catégories de test hors du filtre par défaut (préfixes compris), avec compte, raison écrite et dernier run connu.
Usage (racine) : python3 Tools/juge-donnees/creneau-2026-09-22/hors-filtre.py <dossier contenant filtre-defaut.txt>"""
import re,pathlib,subprocess,sys,collections
S=sys.argv[1]
filtre=[l.strip() for l in open(S+'/filtre-defaut.txt') if l.strip()]
cats=collections.Counter()
for p in pathlib.Path('Assets/Tests').rglob('*.cs'):
    t=re.sub(r'("(?:\\.|[^"\\\n])*")|//[^\n]*', lambda m: m.group(1) or '', p.read_text(encoding='utf-8',errors='replace'))
    for c in re.findall(r'Category\("([A-Za-z0-9_]+)"\)',t): cats[c]+=1
hors=sorted(c for c in cats if not any(c.startswith(f) for f in filtre))
mafiaci=open('Assets/Editor/MafiaCI.cs',encoding='utf-8').read()
# preuves de runs versionnées + journaux locaux de cette session
sources=[str(p) for p in pathlib.Path('Tools').rglob('*.md')]
def dernier_run(c):
    best=None
    for f in sources:
        try: t=open(f,encoding='utf-8',errors='replace').read()
        except: continue
        if re.search(rf'(MAFIA_CI_CATEGORIES=[^\s`]*\b{c}\b|RÉELLEMENT exécutées = \[[^\]]*\b{c}\b)',t):
            d=re.search(r'20\d\d-\d\d-\d\d',f) or re.search(r'20\d\d-\d\d-\d\d',t)
            k=(d.group(0) if d else '0000', f)
            if best is None or k>best: best=k
    return f"{best[0]} — {best[1]}" if best else "aucune trace versionnée"
rows=[]
for c in hors:
    out=subprocess.run(['python3','Tools/compter-par-categorie.py',c],capture_output=True,text=True).stdout
    m=re.search(r'DÉCLARÉS \(règle MafiaCI\) : (\d+)',out); n=m.group(1) if m else '?'
    raison=''
    for l in mafiaci.splitlines():
        if re.search(rf'\b{c}\b',l) and l.strip().startswith('//'): raison=l.strip()[2:].strip()[:150]; break
    rows.append((c,n,raison or '(aucune raison écrite dans MafiaCI.cs)',dernier_run(c)))
print(f"{len(cats)} catégories dans Assets/Tests · filtre : {len(filtre)} · HORS filtre (aucune entrée du filtre n'en est préfixe) : {len(hors)}")
for r in rows: print(' | '.join(r))
