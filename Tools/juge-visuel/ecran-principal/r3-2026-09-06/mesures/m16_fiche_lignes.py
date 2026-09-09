# m16 — bandes de lignes encrees DANS la fiche (x 20..372 CSS), seuil L>110.
# Repere : y0 = haut du panneau mesure en m15 ; toutes les valeurs sont donnees en CSS ET en
# "CSS depuis le haut du panneau" pour etre comparables malgre la position d'ecran.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0,424.52,(420,600)),
   ('fiche19','../capture-fiche-1080x1920.png',2.755,426.50,(422,600)),
   ('fiche24','../capture-fiche-1080x2400.png',2.755,600.73,(596,775))]
for name,f,fac,y0,(ya,yb) in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h} panneau haut={y0} CSS')
    out=[];cur=None
    for y in range(C(ya),min(h,C(yb))):
        c=sum(1 for x in range(C(20),C(372)) if lum(px[x,y])>110)
        if c>=2:
            if cur is None: cur=[y,y,c]
            else: cur[1]=y; cur[2]=max(cur[2],c)
        else:
            if cur: out.append(cur); cur=None
    if cur: out.append(cur)
    for a,b,c in out:
        print(f'   y {a/fac:7.2f}..{(b+1)/fac:7.2f} CSS | rel {a/fac-y0:6.2f}..{(b+1)/fac-y0:6.2f} | h={(b+1-a)/fac:5.2f} | pic={c}px')
