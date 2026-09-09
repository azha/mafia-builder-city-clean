# m04 — segmentation fine de la barre du haut : groupes separes par un blanc >= 6 CSS.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755),
   ('fiche19','../capture-fiche-1080x1920.png',2.755),('fiche24','../capture-fiche-1080x2400.png',2.755)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac))
    print(f'== {name} {w}x{h} fac={fac}')
    bb,cols,rows=ink_bbox(px,(0,0,w,C(52)),90,'bright',2)
    gap=C(6); groups=[];cur=None;blank=0
    for i,c in enumerate(cols):
        if c>=2:
            if cur is None: cur=[i,i]
            else: cur[1]=i
            blank=0
        else:
            if cur is not None:
                blank+=1
                if blank>gap: groups.append(cur);cur=None
    if cur: groups.append(cur)
    for g in groups:
        # bbox verticale du groupe
        b2,_,r2=ink_bbox(px,(g[0],0,g[1]+1,C(52)),90,'bright',1)
        print(f'   x {g[0]/fac:6.1f}..{g[1]/fac:6.1f} CSS (larg {(g[1]-g[0]+1)/fac:5.1f})  y {b2[1]/fac:5.1f}..{b2[3]/fac:5.1f} CSS (haut {(b2[3]-b2[1])/fac:4.1f})')
