#!/usr/bin/env python3
"""m41 - PINCEMENT du crane : minimum de la silhouette entre la rangee la plus
large de la calotte et 80 px plus bas (la jonction calotte/visage).
Controle positif : la largeur max de la calotte doit reproduire m22 (147 / 154)."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAD={'ref':('reference-1080x2102.png',21,452,(17,24,35)),
     'jeu':('capture-1080x2400.png',18,482,(13,22,34))}
CREME2=(185,173,146)
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
for nom in ('ref','jeu'):
    f,X0,Y0,FOND=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    sil={}; vis=set()
    for y in range(560,780):
        s=[x for x in range(150,400) if L1(px[X0+x,Y0+y],FOND)>18]
        if s and (s[-1]-s[0]+1)<200: sil[y]=s[-1]-s[0]+1
        if any(L1(px[X0+x,Y0+y],CREME2)<=90 for x in range(150,400)): vis.add(y)
    yvis=min(vis)
    ycal=max((y for y in sil if y<yvis), key=lambda y:sil[y]); Wcal=sil[ycal]
    fen=[(y,sil[y]) for y in sil if ycal<y<ycal+80]
    ymin,Wmin=min(fen,key=lambda t:t[1])
    Wbas=max(sil[y] for y in sil if ymin<y<ymin+80)
    print(f'{nom} {f} {im.size} : calotte max {Wcal} px a y={ycal} · '
          f'pincement {Wmin} px a y={ymin} ({100*Wmin/Wcal:.1f} % du max, creux de {Wcal-Wmin} px) · '
          f'reprise du crane {Wbas} px')
