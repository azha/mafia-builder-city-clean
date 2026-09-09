# m06 — bbox d'encre serree, element par element, dans la barre du haut.
# Controle positif : sur le canon, .aile.gauche doit commencer a x=17.0 CSS (mesure-canon.txt).
# Controle negatif : la fenetre "aile droite" ne doit PAS attraper le medaillon (bornee a x>=260 CSS).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
def bbox(px,x0,y0,x1,y1,thr=150):
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(px[x,y])>thr: xs.append(x);ys.append(y)
    if not xs: return None
    return (min(xs),min(ys),max(xs)+1,max(ys)+1)
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755),
   ('fiche19','../capture-fiche-1080x1920.png',2.755),('fiche24','../capture-fiche-1080x2400.png',2.755)]
# fenetres en CSS
W={'lib_gauche':(0,6,160,22),'val_gauche':(0,22,160,39),'ratio':(0,38,160,50),
   'lib_droite':(260,4,392,23),'val_droite':(260,23,392,42),'fleche':(0,20,60,40)}
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac))
    print(f'== {name} {w}x{h} fac={fac}')
    for k,(a,b,c,d) in W.items():
        bb=bbox(px,C(a),C(b),min(w,C(c)),C(d))
        if bb is None: print(f'   {k:12s} : RIEN'); continue
        print(f'   {k:12s} : x {bb[0]/fac:6.1f}..{bb[2]/fac:6.1f}  y {bb[1]/fac:5.1f}..{bb[3]/fac:5.1f}  (l={( bb[2]-bb[0])/fac:5.1f} h={(bb[3]-bb[1])/fac:4.1f} CSS)')
