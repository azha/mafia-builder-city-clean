#!/usr/bin/env python3
"""m13 - PASTILLES de PORTEE / URGENCE : couleur du rempli, et forme du 'vide'
(anneau creux dans la reference vs disque plein dans la capture ?).
Methode : sur la rangee PORTEE, on prend la mediane du centre de chaque pastille, puis un profil
horizontal au travers de la 3e pastille (celle qui doit etre 'vide').
Controle positif : les 2 premieres pastilles de PORTEE sont 'pleines' des deux cotes (portee=2/3).
"""
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def rangee(im,y,x0,x1,fond,label,seuil=14):
    px=im.load()
    def d(p): return max(abs(p[0]-fond[0]),abs(p[1]-fond[1]),abs(p[2]-fond[2]))
    runs=[];cur=None
    for x in range(x0,x1):
        if d(px[x,y])>seuil:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur: runs.append(tuple(cur)); cur=None
    if cur: runs.append(tuple(cur))
    runs=[r for r in runs if r[1]-r[0]>=6]
    print(f"[{label}] y={y} fond={fond} : {len(runs)} segments -> {runs}")
    for i,(a,b) in enumerate(runs):
        cx=(a+b)//2
        ech=[px[x,yy] for yy in range(y-4,y+5) for x in range(cx-4,cx+5)]
        med=(round(statistics.median(p[0] for p in ech)),round(statistics.median(p[1] for p in ech)),round(statistics.median(p[2] for p in ech)))
        prof=[L(px[x,y]) for x in range(a,b+1)]
        creux = (prof[len(prof)//2] < min(prof[2],prof[-3]) - 25)
        print(f"    pastille {i+1}: x={a}..{b} (D={b-a+1}) centre={med} lum_centre={L(med):5.1f}"
              f"  bord_g={prof[1]:5.1f} bord_d={prof[-2]:5.1f}  CREUX(anneau)={creux}")
    return runs

print("\n-- RANGEE PORTEE --")
# REF : pastilles de portee sous le libelle PORTEE (voir crop) ; fond = creme de la carte
rangee(ref,1424,130,290,(219,206,171),'REF PORTEE')
# CAP : rangee 'Portee' inline
rangee(cap,1583,140,420,(13,13,13),'CAP PORTEE')

print("\n-- RANGEE URGENCE --")
rangee(ref,1424,520,700,(219,206,171),'REF URGENCE')
rangee(cap,1629,140,420,(13,13,13),'CAP URGENCE')
