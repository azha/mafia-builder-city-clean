# m14 — rectangle de la fiche : plus long segment sombre (L<45) sur des lignes/colonnes de sonde.
# Controle positif : canon -> x 13..379, y 424.5..593.7 CSS (mesure-canon.txt).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
def longest_dark_run(vals, thr=45):
    best=(0,0,0);cur=None
    for i,v in enumerate(vals):
        if v<thr:
            if cur is None: cur=[i,i]
            else: cur[1]=i
        else:
            if cur and cur[1]-cur[0]>best[2]-best[0]+0 : 
                if cur[1]-cur[0] > best[1]-best[0]: best=(cur[0],cur[1],0)
            cur=None
    if cur and cur[1]-cur[0] > best[1]-best[0]: best=(cur[0],cur[1],0)
    return best[0],best[1]
F=[('canon','../ecran-canon.png',3.0,470.0),('fiche19','../capture-fiche-1080x1920.png',2.755,470.0),
   ('fiche24','../capture-fiche-1080x2400.png',2.755,645.0)]
for name,f,fac,yprobe in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    # bords lateraux : moyenne sur 5 lignes de sonde (evite les glyphes)
    L=[];R=[]
    for dy in (-8,-4,0,4,8):
        y=C(yprobe+dy)
        vals=[lum(px[x,y]) for x in range(w)]
        a,b=longest_dark_run(vals)
        L.append(a);R.append(b)
    print(f'   bords lateraux (5 sondes) : gauche {[round(v/fac,1) for v in L]}  droite {[round(v/fac,1) for v in R]}')
    xg=med(L)/fac; xd=med(R)/fac
    print(f'   -> x {xg:.1f}..{xd:.1f} CSS  (largeur {xd-xg:.1f})')
    # bords haut/bas : colonnes de sonde dans le padding gauche
    T=[];B=[]
    for xc in (xg+3, xg+5, xd-3, xd-5):
        x=C(xc)
        vals=[lum(px[x,y]) for y in range(0,h)]
        a,b=longest_dark_run(vals)
        T.append(a);B.append(b)
    print(f'   bords haut/bas (4 sondes) : haut {[round(v/fac,1) for v in T]}  bas {[round(v/fac,1) for v in B]}')
    print(f'   -> y {med(T)/fac:.1f}..{med(B)/fac:.1f} CSS  (hauteur {(med(B)-med(T))/fac:.1f})')
