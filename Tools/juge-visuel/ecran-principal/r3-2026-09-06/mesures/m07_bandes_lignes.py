# m07 — bandes de lignes encrees dans une colonne donnee => hauteurs de capitale honnetes.
# Controle positif : sur le canon, .aile.gauche (17..113 CSS) doit rendre 3 bandes
#   (libelle 8.5px, valeur 17px, ratio 2px) et la 3e doit faire 2.0 CSS de haut (CSS: height:2px).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
def bandes(px,x0,x1,y0,y1,thr,fac,minc=1):
    rows=[]
    for y in range(y0,y1):
        c=sum(1 for x in range(x0,x1) if lum(px[x,y])>thr)
        rows.append((y,c))
    out=[];cur=None
    for y,c in rows:
        if c>=minc:
            if cur is None: cur=[y,y,c]
            else: cur[1]=y; cur[2]=max(cur[2],c)
        else:
            if cur: out.append(cur); cur=None
    if cur: out.append(cur)
    return out
F=[('canon','../ecran-canon.png',3.0,(17,113)),('district','../capture-district-1080x2400.png',2.755,(60,155)),
   ('fiche19','../capture-fiche-1080x1920.png',2.755,(60,155))]
for name,f,fac,(a,b) in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac))
    print(f'== {name} {w}x{h}  aile gauche x={a}..{b} CSS')
    for bd in bandes(px,C(a),C(b),0,C(56),150,fac):
        print(f'   y {bd[0]/fac:5.2f}..{(bd[1]+1)/fac:5.2f} CSS  haut={(bd[1]+1-bd[0])/fac:5.2f}  pic={bd[2]}px')
    print(f'-- aile droite x=260..392 CSS')
    for bd in bandes(px,C(260),min(w,C(392)),0,C(56),150,fac):
        print(f'   y {bd[0]/fac:5.2f}..{(bd[1]+1)/fac:5.2f} CSS  haut={(bd[1]+1-bd[0])/fac:5.2f}  pic={bd[2]}px')
