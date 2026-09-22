#!/usr/bin/env python3
"""TD-576 — classe les classes de test, DANS L'ORDRE D'EXÉCUTION, selon la forme d'orphelin que leur TearDown laisse.

Formes : ÉCRASEMENT (un test monte deux fois dans le même champ, directement ou par une aide — le premier montage
n'est plus détruit : la cause d'Ecran9), HÔTE DE NAV non démonté, Destroy DIFFÉRÉ au TearDown, LOCAL jamais détruit.
⚠️ Heuristique : elle CLASSE, elle ne tranche pas — chaque ligne signalée se lit (td576-cause.md). Elle a raté l'hôte
de nav du test C d'ExceptionQueue, trouvé à la lecture.

Usage (depuis la racine du dépôt) :
    python3 Tools/juge-donnees/creneau-2026-09-22/orphelins-par-teardown.py Tools/juge-donnees/creneau-2026-09-22/p1-classes-ordre.txt
L'ordre : les classes des lignes « MafiaCI: RUN » du journal, dédoublonnées dans l'ordre (gate-p1.log du 22/09).
"""
import re, pathlib, sys
R=pathlib.Path('.'); T=R/'Assets'/'Tests'
ordre=[l.strip() for l in open(sys.argv[1]) if l.strip()]
src={}
for p in T.rglob('*.cs'):
    s=p.read_text(encoding='utf-8',errors='replace')
    for m in re.finditer(r'\bclass\s+(\w+)',s): src.setdefault(m.group(1),(p,s))
def corps(s,i):
    j=s.index('{',i); d=0
    for k in range(j,len(s)):
        if s[k]=='{': d+=1
        elif s[k]=='}':
            d-=1
            if d==0: return s[j:k+1]
    return s[j:]
def methodes(s):
    out=[]
    for m in re.finditer(r'((?:\[[^\]]*\]\s*)*)(?:public|private|protected|internal|static|\s)+[\w<>\[\],. ]+?\s(\w+)\s*\([^)]*\)\s*(?:where[^{]*)?\{',s):
        out.append((m.group(1),m.group(2),corps(s,m.end()-1)))
    return out
for n,c in enumerate(ordre,1):
    if c not in src: print(f"{n:2} {c}: SOURCE INTROUVABLE"); continue
    p,s=src[c]
    ms=methodes(s)
    td=''.join(b for a,nm,b in ms if 'TearDown' in a)
    tests=[(nm,b) for a,nm,b in ms if re.search(r'\[(Unity)?Test\b|\[TestCase',a)]
    aides={nm:b for a,nm,b in ms if not re.search(r'Test\b|TestCase|SetUp|TearDown',a)}
    champs=set(re.findall(r'(?<![\w.])(\w+)\s*=\s*new GameObject\(',s))-set(re.findall(r'\bvar\s+(\w+)\s*=\s*new GameObject',s))
    constats=[]
    # 1. écrasement : un test monte deux fois dans le même champ (directement ou via une aide)
    montA={nm for nm,b in aides.items() if any(re.search(rf'(?<![\w.]){f}\s*=\s*new GameObject',b) for f in champs)}
    for nm,b in tests:
        k=len(re.findall(r'(?<![\w.])(?:'+'|'.join(champs)+r')\s*=\s*new GameObject',b)) if champs else 0
        k+=sum(len(re.findall(rf'\b{a}\s*\(',b)) for a in montA)
        if k>=2: constats.append(f"ÉCRASEMENT {nm} ({k} montages dans un champ)")
    # 2. hôte de navigation non démonté
    nav=[nm for nm,b in tests if re.search(r'\.Open(?:Nav|Exceptions|CityMap|BuildingCard|Pipeline|Autonomy|Detail)\s*\(',b)]
    if nav and 'LastNav' not in td and 'FindObjects' not in td: constats.append(f"HÔTE DE NAV non démonté ({len(nav)} test(s) : {', '.join(nav[:3])})")
    # 3. destruction différée d'un émetteur au TearDown
    if re.search(r'Object\.Destroy\(|\bDestroy\(',td) and re.search(r'Controller|Client|Shell|Screen',td): constats.append("Destroy DIFFÉRÉ au TearDown")
    # 4. locataire local jamais détruit
    for nm,b in tests:
        for v in re.findall(r'\bvar\s+(\w+)\s*=\s*new GameObject\([^;]*;',b):
            pass
        for v in re.findall(r'\bvar\s+(\w+)\s*=\s*new GameObject',b):
            if re.search(rf'\b{v}\.AddComponent<\w*(Controller|Shell|Screen)',b) and not re.search(rf'Destroy\w*\(\s*{v}\b',b) and v not in td:
                constats.append(f"LOCAL non détruit {nm}:{v}")
    notd='' if td else ' · pas de TearDown'
    print(f"{n:2} {c} [{p.name}]{notd} : " + ('; '.join(constats) if constats else 'rien'))
