# m13 — bbox de la fiche : detectee par la LIGNE LAITON du haut (.fiche::after) et par le contraste
# panneau/art sur les bords lateraux. Controle positif : canon doit rendre .fiche 366x169.19 a (13,424.52).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0,(400,620)),
   ('fiche19','../capture-fiche-1080x1920.png',2.755,(380,640)),
   ('fiche24','../capture-fiche-1080x2400.png',2.755,(500,780))]
for name,f,fac,(ya,yb) in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h} fenetre y {ya}..{yb} CSS')
    # 1) la ligne laiton du haut : rangee maximisant (r-b) mediane sur x 60..330 CSS
    best=None
    for y in range(C(ya),min(h,C(yb))):
        R=[px[x,y][0] for x in range(C(60),C(330))];B=[px[x,y][2] for x in range(C(60),C(330))]
        d=med(R)-med(B)
        if best is None or d>best[1]: best=(y,d)
    y0=best[0]
    print(f'   filet haut de fiche : y={y0/fac:.2f} CSS  (r-b median={best[1]:.0f})')
    # extension du filet
    prof=[(x,px[x,y0][0]-px[x,y0][2]) for x in range(w)]
    mx=max(p[1] for p in prof); on=[x for x,d in prof if d>0.5*mx]
    print(f'      filet: max(r-b)={mx} ; >50% de x {on[0]/fac:.1f}..{on[-1]/fac:.1f} CSS ; couleur au coeur {median_win(px,(on[0]+on[-1])//2,y0,1)}')
    on2=[x for x,d in prof if d>0.15*mx]
    print(f'      filet: >15% de x {on2[0]/fac:.1f}..{on2[-1]/fac:.1f} CSS')
    # 2) bords lateraux : sur une ligne a y0+40 CSS, saut de luminance
    yl=y0+C(40)
    row=[(x,lum(px[x,yl])) for x in range(w)]
    print(f'   ligne y={yl/fac:.1f} CSS : L aux x = ' + ', '.join(f'{x/fac:.0f}:{L:.0f}' for x,L in row[::C(20)]))
    # 3) bas du panneau : colonne x=196 CSS, chercher la remontee de luminance
    col=[(y,lum(px[C(30),y])) for y in range(y0,min(h,C(yb)+C(60)))]
    print(f'   colonne x=30 CSS : L = ' + ', '.join(f'{y/fac:.0f}:{L:.0f}' for y,L in col[::C(6)]))
