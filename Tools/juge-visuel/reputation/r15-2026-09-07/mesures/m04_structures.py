"""m04 — inventaire des LIGNES HORIZONTALES de structure (bords de panneaux, filets).
Definition : rangee y ou >= NMIN pixels verifient |lum(y) - lum(y-4)| >= 8 sur la bande utile.
Convention de bord : mi-alpha (appliquee ensuite aux bords retenus).
Controle positif : les filets OR du cadre (deja localises par m01) DOIVENT sortir.
Controle negatif : une bande de fond nu (hors cadre) ne doit rendre aucune ligne.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

def lignes(im, x0, x1, y0, y1, nmin=300, d=4, s=8):
    p=im.load(); out=[]
    for y in range(y0+d, y1+1):
        n=sum(1 for x in range(x0,x1+1) if abs(lum(p[x,y])-lum(p[x,y-d]))>=s)
        out.append((y,n))
    return [(y,n) for y,n in out if n>=nmin], out

CFG = {
 'reference-1080x2102.png': (28, 1051, 440, 2095, 'REF'),
 'capture-1080x2400.png'  : (25, 1054, 470, 2130, 'JEU 2400'),
 'capture-1080x1920.png'  : (25, 1054, 240, 1650, 'JEU 1920'),
}
for nom,(x0,x1,y0,y1,lab) in CFG.items():
    print("="*74); im=ouvrir(nom)
    L,allr=lignes(im,x0,x1,y0,y1)
    # regrouper
    grp=[];cur=[L[0]]
    for r in L[1:]:
        if r[0]-cur[-1][0]<=3: cur.append(r)
        else: grp.append(cur); cur=[r]
    grp.append(cur)
    print(f"  {lab} : {len(grp)} lignes de structure")
    for g in grp:
        ys=[y for y,_ in g]; nm=max(n for _,n in g)
        print(f"    y {ys[0]}..{ys[-1]}  n_max={nm}")
