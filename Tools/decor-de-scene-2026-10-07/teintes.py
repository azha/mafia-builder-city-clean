#!/usr/bin/env python3
"""Pour chaque couleur du catalogue de décor : le jeton nommé le plus proche de DesignTokens.asset et sa distance (euclidienne 0-255, comme la garde
TD-612 `LitterauxDeCouleurPlayModeTests`, seuil 4,0). d <= 4 => le catalogue DOIT passer par le jeton ; d > 4 => littéral "#rrggbb" admis.
Usage : python3 teintes.py  (depuis la racine du dépôt ou ce dossier) -> teintes.json"""
import re,json,math,os
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.abspath(os.path.join(D,'..','..'))
y=open(os.path.join(R,'Assets/Resources/DesignTokens.asset'),encoding='utf-8').read()
toks={m.group(1):tuple(float(m.group(i))*255 for i in (2,3,4)) for m in re.finditer(r'^\s{2}(\w+): \{r: ([\d.e-]+), g: ([\d.e-]+), b: ([\d.e-]+), a: ([\d.e-]+)\}',y,re.M)}
sup=json.load(open(os.path.join(D,'mesure-support.json')))
cols=set()
for r in sup:
    for m in re.finditer(r'rgba?\((\d+), (\d+), (\d+)',r['bg']+' '+r['bgColor']): cols.add(tuple(int(x) for x in m.groups()))
# + TOUTES les couleurs écrites dans le catalogue (DESIGN.md §3.2 à §4, hors la table §4.1 elle-même) : zones dominantes ㉓ ㉘, cerne, enseigne, voile…
design=open(os.path.join(D,'DESIGN.md'),encoding='utf-8').read()
a=design.index('### 3.2'); b=design.index('### 4.1')
for h in set(re.findall(r'#([0-9a-fA-F]{6})(?![0-9a-fA-F])',design[a:b])) | {'0a0f18','b08d3e','2a3648','d9ab4e','7fd4d9','0b111b','0d131e','0b1016','0d0f10'}:
    cols.add(tuple(int(h[i:i+2],16) for i in (0,2,4)))
out=[]
for c in sorted(cols):
    if c==(0,0,0): continue
    n,v=min(toks.items(),key=lambda kv: math.dist(c,kv[1])); d=math.dist(c,v)
    out.append(dict(hex='#%02x%02x%02x'%c,jeton=n,d=round(d,2),regle='JETON' if d<=4.0 else 'littéral'))
json.dump(out,open(os.path.join(D,'teintes.json'),'w'),ensure_ascii=False,indent=1)
print(len(out),'couleurs :',sum(o['regle']=='JETON' for o in out),'par jeton,',sum(o['regle']!='JETON' for o in out),'littérales (',len(toks),'jetons )')
