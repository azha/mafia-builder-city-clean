# m34 — les volutes decoratives du canon (.volute g/d : 34x12 CSS, opacity .28, trait creme)
# gauche a x=4..38, droite a x=354..388, centrees verticalement dans la barre (y ~20..32 CSS).
# Controle positif : sur le canon, la volute DROITE doit exister (elle n'est pas remplacee).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); px=im.load(); w,h=im.size
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    for lbl,(a,b) in {'volute gauche':(3,40),'volute droite':(352,390)}.items():
        vals=[]
        for y in range(C(18),C(36)):
            for x in range(C(a),min(w,C(b))):
                vals.append((lum(px[x,y]),x,y))
        vals.sort(reverse=True)
        base=med([v[0] for v in vals])
        n=sum(1 for v in vals if v[0]>base+12)
        print(f'   {lbl:14s}: fond L={base:.1f} ; pixels L>fond+12 : {n} ; max L={vals[0][0]:.0f} a x={vals[0][1]/fac:.1f} y={vals[0][2]/fac:.1f}')
