#!/usr/bin/env python3
"""Inventaire écran × couche de décor × matière, compté dans la maquette série 6 (ecrans-brennar-6.html) — lit les mesures JSON voisines.
Régénérer : node mesurer-*.cjs … > mesure-*.json  puis  python3 inventaire.py > inventaire-compte.txt
Les mesures viennent de Chromium (computed style), pas d'une lecture du CSS à l'œil."""
import json,os,re,collections
D=os.path.dirname(os.path.abspath(__file__))
L=lambda n:json.load(open(os.path.join(D,n),encoding='utf-8'))
couches,support,bande,ecrans=L('mesure-couches.json'),L('mesure-support.json'),L('mesure-bande-de-scene.json'),L('ecrans-index.json')
sup={r['i']:r for r in support}; ban={r['i']:r for r in bande}
def famille(root):
    if root in('rep6','vnt6','jrn6','dos6','bln6','hrz6','mar6'): return 'A support standard'
    if root in('serv6','appr6','parl6','demo6','carn6','cfl6','lieg6','vitr6','cofr6'): return 'B support à fond propre'
    return 'C objet / matière dédiée'
def lum(f):
    m=re.search(r'brightness\(([\d.]+)\)',f or ''); return m.group(1) if m else '—'
rows=[]
for sym,ecran,ctrl,x in ecrans:
    if not x: rows.append((sym,ctrl,None)); continue
    i=x['cadres'][0]; s=sup.get(i); b=ban.get(i); c=couches[i]
    objs=[k.split(':')[0] for k,_ in x['couches'] if k.split(':')[0] not in('mano','(ombre-interne)')]
    rows.append((sym,ctrl,dict(i=i,n=len(x['cadres']),scene=c['scene'],lum=lum(b['sceneFilter']),bande=b['sceneVisiblePct'],
        racine=s['rootCls'] if s else '?',famille=famille(s['rootCls']) if s else '?',cerne=bool(s and s['cerne']),enseigne=bool(s and s['enseigne']),
        objets=objs,halos=c['couches'].get('halo',0))))
print('SYM  CONTRÔLEUR                         CADRE(n)  SCÈNE        LUM   BANDE  RACINE    FAMILLE                   CERNE ENSEIGNE  OBJETS')
for sym,ctrl,r in rows:
    if r is None: print(f'{sym:<4} {ctrl[:34]:<34} — aucune maquette série 6'); continue
    print(f"{sym:<4} {ctrl[:34]:<34} {r['i']:>3}({r['n']})  {str(r['scene']):<11} {r['lum']:<5} {r['bande']:>3}%  {r['racine']:<9} {r['famille']:<25} {str(r['cerne'])[0]:<5} {str(r['enseigne'])[0]:<8} {','.join(r['objets'][:6])}")
av=[r for _,_,r in rows if r]
print('\nÉCRANS AVEC MAQUETTE SÉRIE 6 :',len(av),'| sans :',sum(1 for _,_,r in rows if not r))
print('Scènes :',dict(collections.Counter(r['scene'] for r in av)))
print('Familles :',dict(collections.Counter(r['famille'] for r in av)))
print('Cerne+enseigne :',sum(r['cerne'] and r['enseigne'] for r in av),'| luminosités distinctes :',sorted({r['lum'] for r in av}))
print('Cadres couverts :',sum(r['n'] for r in av))
