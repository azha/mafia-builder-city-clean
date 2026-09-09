#!/usr/bin/env python3
# 16 — le vide est-il VRAIMENT vide, ou porte-t-il un objet TRES peu contraste
#   (cadre pointille, plaque presque noire) que le seuil 25 aurait manque ?
#   On redescend le seuil jusqu'a 2/255 au-dessus du fond (13,13,13).
#   CONTROLE POSITIF : au seuil 2, la sonde DOIT retrouver la plaque bleutee du dock (y>2179).
#   CONTROLE NEGATIF : au seuil 2, elle doit aussi retrouver le texte (bande 472..509).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); W,H=im.size
print(f"OUVERT capture-1080x2400.png -> {W}x{H}")
px=im.load()
for seuil in [25,10,5,3,2,1]:
    n=0; ymin=None; ymax=None; couleurs=set()
    for y in range(520,2170):
        for x in range(0,W,2):
            p=px[x,y]
            if abs(lum(p)-13.0)>seuil:
                n+=1; couleurs.add(p)
                if ymin is None: ymin=y
                ymax=y
    print(f"  seuil {seuil:2d}/255 : {n:7d} px d'ecart dans y520..2169 | y {ymin}..{ymax} | {len(couleurs)} couleurs distinctes")
print("  CONTROLE + (seuil 2) sur la plaque du dock y2220..2399 :", end=' ')
n=sum(1 for y in range(2220,2400) for x in range(0,W,2) if abs(lum(px[x,y])-13.0)>2)
print(f"{n} px -> la sonde VOIT bien un objet peu contraste")
print("  CONTROLE - (seuil 2) sur la bande de texte y472..509 :", end=' ')
n=sum(1 for y in range(472,510) for x in range(0,W,2) if abs(lum(px[x,y])-13.0)>2)
print(f"{n} px")
# le vide contient-il une variation de couleur (degrade) ?
ech=[px[x,y] for y in range(600,2100,150) for x in range(50,1050,150)]
print("  echantillon 7x7 du vide, couleurs distinctes :", sorted(set(ech)))
