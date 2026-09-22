#!/usr/bin/env python3
"""TD-576, classe « catalogue » : les classes de test qui chargent I18nCatalog (directement, ou en montant un des 14 contrôleurs
qui l amorcent, le shell, ou la scène du build) et ne l oublient JAMAIS. Statique, borne : la garde de sortie de MafiaCI mesure le vrai.
Usage (racine) : python3 Tools/juge-donnees/creneau-2026-09-22/catalogue-sortie.py"""
import re,pathlib
CHARGEURS=['JournalScreenController','ChaineDApproScreenController','ExceptionQueueController','FiliereScreenController','ConflitScreenController',
 'AutonomyInboxController','DemolitionScreenController','DistributionScreenController','LieutenantScreenController','LoiScreenController',
 'CarnetScreenController','ReputationScreenController','DistrictInteriorScreenController','AppShell']
def sans_comm(t): return re.sub(r'("(?:\\.|[^"\\\n])*")|//[^\n]*|/\*[\s\S]*?\*/', lambda m: m.group(1) or '', t)
rows=[]
for p in sorted(pathlib.Path('Assets/Tests').rglob('*.cs')):
    t=sans_comm(p.read_text(encoding='utf-8',errors='replace'))
    for m in re.finditer(r'(?m)^\s{4}(?:\[[^\]]*\]\s*)*public (?:sealed )?class (\w+)',t):
        cls=m.group(1); j=t.find('{',m.end()); d=0
        for k in range(j,len(t)):
            d+= t[k]=='{'; d-= t[k]=='}'
            if d==0: break
        b=t[j:k]
        direct=bool(re.search(r'I18nCatalog\.(ChargerPourTest|Amorcer)\(|\.AmorcerLeDictionnaire\(',b))
        monte=sorted({c for c in CHARGEURS if re.search(rf'(AddComponent|MonterLocataire\w*)<\s*(?:[\w.]+\.)?{c}\s*>',b)})
        scene='LoadSceneAsync(0' in b or 'ChargerLaSceneDeDemarrageDuBuild' in b
        if not (direct or monte or scene): continue
        oublie=bool(re.search(r'I18nCatalog\.Oublier\(',b))
        rows.append((cls,p.name,direct,monte,scene,oublie))
charge=[r for r in rows]; fautifs=[r for r in rows if not r[5]]
print(f"{len(charge)} classes chargent le catalogue (direct, écran chargeur, shell ou scène du build) · {len(fautifs)} ne l'oublient JAMAIS")
for c,f,d,m,s,o in fautifs: print(f"  {c} [{f}] : {'direct ' if d else ''}{'scène ' if s else ''}{','.join(m)}")
