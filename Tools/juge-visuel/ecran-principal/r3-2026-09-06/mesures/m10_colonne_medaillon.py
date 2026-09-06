# m10 — colonne x=196 CSS (axe du medaillon) : runs de pixels "or/orange" -> haut d'anneau, moyeu, bas d'anneau, losange.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755),
   ('fiche19','../capture-fiche-1080x1920.png',2.755)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    x=C(196); runs=[];cur=None
    for y in range(0,C(100)):
        p=px[x,y]; hit=(p[0]-p[2])>30 and p[0]>80
        if hit:
            if cur is None: cur=[y,y]
            else: cur[1]=y
        else:
            if cur: runs.append(cur); cur=None
    if cur: runs.append(cur)
    for a,b in runs:
        print(f'   run y {a/fac:6.2f}..{(b+1)/fac:6.2f} CSS (ep {(b+1-a)/fac:5.2f})  couleur {median_win(px,x,(a+b)//2,0)}')
