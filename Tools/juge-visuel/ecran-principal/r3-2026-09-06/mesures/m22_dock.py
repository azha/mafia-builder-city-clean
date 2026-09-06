# m22 — le dock : ronds (diametre, ecart, centre), libelles (bande, hauteur de capitale), pastille active.
# Controle positif : canon .dockb .rond = 46 CSS, 1er rond a x=71 (mesure-canon.txt) ; .dock 390x90.17 a (1,605.70).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0,(600,697)),('district','../capture-district-1080x2400.png',2.755,(760,872)),
   ('fiche19','../capture-fiche-1080x1920.png',2.755,(600,697)),('fiche24','../capture-fiche-1080x2400.png',2.755,(760,872))]
for name,f,fac,(ya,yb) in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h} zone dock y {ya}..{yb} CSS')
    # 1) bande des libelles : lignes encrees (L>110) dans la zone
    out=[];cur=None
    for y in range(C(ya),min(h,C(yb))):
        c=sum(1 for x in range(0,w) if lum(px[x,y])>110)
        if c>=2:
            if cur is None: cur=[y,y,c]
            else: cur[1]=y;cur[2]=max(cur[2],c)
        else:
            if cur: out.append(cur);cur=None
    if cur: out.append(cur)
    for a,b,c in out: print(f'   bande encre y {a/fac:7.2f}..{(b+1)/fac:7.2f} (h={(b+1-a)/fac:5.2f}) pic={c}px')
    # 2) les ronds : contour clair (bord #ffffff22) - on cherche les colonnes ou le contour existe
    #    approche : sur la ligne mediane des ronds, groupes de pixels L>32 sur fond plus sombre
    if out:
        # ligne mediane des ronds = un peu au dessus de la 1ere bande de libelles
        ylib=out[-1][0]
    for probe in ('auto',):
        pass
