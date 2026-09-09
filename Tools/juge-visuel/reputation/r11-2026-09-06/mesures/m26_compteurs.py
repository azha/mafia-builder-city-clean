#!/usr/bin/env python3
"""m26 - compteurs : boites, chiffres (coeur strict L1<=20, hors halo), et le
TIRET du 3e compteur (ecart assume A1 : il doit avoir la couleur et la position
des deux autres chiffres).
Convention de bord : COEUR OPAQUE au seuil (L1<=20 du jeton) pour l'epaisseur de
trait, afin que le halo de la reference ne gonfle pas la mesure.
Controle positif : la hauteur de capitale doit valoir 37 px des deux cotes.
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CYAN=(127,212,217)
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAD={'ref':('reference-1080x2102.png',21,452,250,363),
     'jeu':('capture-1080x2400.png',18,482,245,359)}
BOITES={'ref':[(28,335),(345,652),(662,969)],'jeu':[(28,335),(345,652),(662,969)]}
for nom in ('ref','jeu'):
    f,X0,Y0,ya,yb=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    # bornes verticales des boites : liserés
    cols=[x for x in range(20,1020)
          if sum(1 for y in range(ya+2,yb-1) if lum(px[X0+x,Y0+y])-max(lum(px[X0+x-4,Y0+y]),lum(px[X0+x+4,Y0+y]))>3)>=60]
    print('  colonnes de liseré vertical des 3 boites :', cols)
    for i,(xa,xb) in enumerate(BOITES[nom]):
        enc=[(x,y) for y in range(ya+4,yb-4) for x in range(xa+8,xb-7)
             if L1(px[X0+x,Y0+y],CYAN)<=20]
        if not enc:
            print(f'  boite {i+1} : AUCUNE encre cyan au coeur'); continue
        xs=[p[0] for p in enc]; ys=[p[1] for p in enc]
        ymid=(min(ys)+max(ys))//2
        runs=[];cur=0
        S=set(enc)
        for x in range(min(xs),max(xs)+1):
            if (x,ymid) in S: cur+=1
            else:
                if cur: runs.append(cur); cur=0
        if cur: runs.append(cur)
        med=tuple(int(statistics.median([px[X0+p[0],Y0+p[1]][k] for p in enc])) for k in range(3))
        print(f'  boite {i+1} x{xa}..{xb} : encre {len(enc)} px · bbox x {min(xs)}..{max(xs)} '
              f'(l={max(xs)-min(xs)+1}) y {min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1}) '
              f'centre x {(min(xs)+max(xs))/2:.1f} · couleur {med} · runs a mi-hauteur {runs}')
