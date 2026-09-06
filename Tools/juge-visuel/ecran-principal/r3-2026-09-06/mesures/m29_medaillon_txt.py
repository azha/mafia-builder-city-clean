# m29 — (a) textes du medaillon : bandes + hauteur de capitale + couleur ;
#       (b) graisse du texte de bouton : epaisseur du fut vertical du "B" de BLANCHIR ;
#       (c) contraste des libelles du dock sur leur fond.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
CAS=[('canon','../ecran-canon.png',3.0,671.0,(161.7,172.0),(555.67,564.0)),
     ('fiche19','../capture-fiche-1080x1920.png',2.755,669.3,(158.3,169.1),(555.35,564.07))]
for name,f,fac,ylib,(bx0,bx1),(by0,by1) in CAS:
    im=Image.open(f).convert('RGB'); px=im.load(); w,h=im.size
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    # (a) medaillon : bandes de lignes encrees dans x 172..222 CSS, y 20..70 CSS
    out=[];cur=None
    for y in range(C(20),C(72)):
        c=sum(1 for x in range(C(172),C(222)) if lum(px[x,y])>110)
        if c>=2:
            if cur is None: cur=[y,y,c]
            else: cur[1]=y;cur[2]=max(cur[2],c)
        else:
            if cur: out.append(cur);cur=None
    if cur: out.append(cur)
    for a,b,c in out:
        P=[px[x,y] for y in range(a,b+1) for x in range(C(172),C(222)) if lum(px[x,y])>140]
        P.sort(key=lum); core=P[int(len(P)*0.8):] if P else []
        col=(med([p[0] for p in core]),med([p[1] for p in core]),med([p[2] for p in core])) if core else None
        xs=[x for y in range(a,b+1) for x in range(C(172),C(222)) if lum(px[x,y])>110]
        print(f'   medaillon bande y {a/fac:6.2f}..{(b+1)/fac:6.2f} (h={(b+1-a)/fac:5.2f}) x {min(xs)/fac:.1f}..{(max(xs)+1)/fac:.1f} couleur {col}')
    # (b) fut du B : ligne horizontale a mi-hauteur du B
    ym=C((by0+by1)/2)
    runs=[];cur=None
    for x in range(C(bx0-2),C(bx0+10)):
        if lum(px[x,ym])>110:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur: runs.append(cur);cur=None
    if cur: runs.append(cur)
    print(f'   (b) "B" de BLANCHIR, y={ym/fac:.1f} : runs = ' + ', '.join(f'{a/fac:.2f}..{(b+1)/fac:.2f} (ep {(b+1-a)/fac:.2f})' for a,b in runs))
    # (c) contraste libelles dock
    yl=C(ylib+3)
    P=[px[x,y] for y in range(C(ylib),C(ylib+6)) for x in range(C(75),C(112)) if lum(px[x,y])>140]
    P.sort(key=lum); core=P[int(len(P)*0.8):]
    txt=(med([p[0] for p in core]),med([p[1] for p in core]),med([p[2] for p in core]))
    Q=[px[x,y] for y in range(C(ylib-3),C(ylib+9)) for x in range(C(60),C(130)) if lum(px[x,y])<50]
    bg=(med([p[0] for p in Q]),med([p[1] for p in Q]),med([p[2] for p in Q]))
    print(f'   (c) libelle dock : texte {txt} fond {bg} contraste {contrast(txt,bg):.2f}:1')
