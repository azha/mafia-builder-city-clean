# m24 — (a) la "pointe" d'onglet actif (canon : 14x2 CSS laiton sous le rond 1) ;
#       (b) la pastille de notification (canon : disque or 8 CSS en haut a droite du rond 2) ;
#       (c) fond du dock (profil vertical au centre d'une gouttiere entre deux ronds).
# Controle positif : sur le canon, (a) doit sortir 14.0 CSS de large et (b) ~8 CSS de diametre.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0,615.70,605.70),('district','../capture-district-1080x2400.png',2.755,788.10,778.0),
   ('fiche19','../capture-fiche-1080x1920.png',2.755,614.1,604.0),('fiche24','../capture-fiche-1080x2400.png',2.755,788.10,778.0)]
for name,f,fac,rtop,dtop in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}  haut des ronds={rtop} CSS')
    print('   (a) sous le rond 1 (x 80..108 CSS), lignes a encre "laiton" (r-b>25 et r>70) :')
    for d in [x*0.5 for x in range(0,20)]:
        y=C(rtop+46+d-2)
        xs=[x for x in range(C(80),C(108)) if (px[x,y][0]-px[x,y][2])>25 and px[x,y][0]>70]
        if xs: print(f'      y={rtop+46+d-2:7.2f} : x {xs[0]/fac:.1f}..{(xs[-1]+1)/fac:.1f} (l={(xs[-1]+1-xs[0])/fac:.2f}) couleur {median_win(px,(xs[0]+xs[-1])//2,y,0)}')
    print('   (b) coin haut-droit du rond 2 (x 175..196, y rtop-6..rtop+10), pixels or (r-b>60) :')
    pts=[(x,y) for y in range(C(rtop-6),C(rtop+10)) for x in range(C(175),C(196)) if (px[x,y][0]-px[x,y][2])>60 and px[x,y][0]>120]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        print(f'      n={len(pts)} ; bbox x {min(xs)/fac:.1f}..{(max(xs)+1)/fac:.1f} y {min(ys)/fac:.1f}..{(max(ys)+1)/fac:.1f} ; couleur {median_win(px,(min(xs)+max(xs))//2,(min(ys)+max(ys))//2,1)}')
    else: print('      AUCUN pixel or -> pas de pastille')
    print('   (c) fond du dock, colonne x=128 CSS (gouttiere ronds 1-2) :')
    for d in range(0,96,8):
        y=C(dtop+d)
        if y<h: print(f'      y={dtop+d:7.1f} : {median_win(px,C(128),y,3)}')
