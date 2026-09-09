#!/usr/bin/env python3
"""m42 - recouvrement du cou par le col : rangees ou le cou (creme2, largeur
>=8 u) et le col (creme) coexistent. Controle positif : le cou doit faire
9,84 u (ref) / 10,23 u (jeu) comme en m29.
Et : evocation de chrome de la REFERENCE (derniere rangee d'encre au-dessus du cadre)."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREME2=(185,173,146); CREME=(234,224,200)
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom,f,X0,Y0 in [('ref','reference-1080x2102.png',21,452),('jeu','capture-1080x2400.png',18,482)]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    cou=[];col=[]
    for y in range(760,930):
        c2=[x for x in range(200,350) if L1(px[X0+x,Y0+y],CREME2)<=45]
        c1=[x for x in range(200,350) if L1(px[X0+x,Y0+y],CREME)<=45]
        if len(c2)>=40: cou.append(y)
        if len(c1)>=5: col.append(y)
    inter=[y for y in cou if y in col]
    print(f'{nom} {f} {im.size} : cou y {min(cou)}..{max(cou)} · col y {min(col)}..{max(col)} '
          f'· recouvrement {len(inter)} rangees ({min(inter) if inter else "-"}..{max(inter) if inter else "-"})')
# evocation de chrome de la reference
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); px=im.load()
last=None
for y in range(0,452):
    n=sum(1 for x in range(30,1050,2) if lum(px[x,y])>lum(px[x,451])+6)
    if n>=10: last=y
print('reference : derniere rangee d encre au-dessus du cadre (evocation de chrome) y =', last,
      '· haut du cadre 452 -> ecart', 452-(last or 0))
