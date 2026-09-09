# m15 — rectangle de la fiche par COMPTAGE : pour chaque colonne, part des lignes sombres (L<48)
# dans une bande y donnee ; le panneau = colonnes a forte part. Idem en lignes.
# Controle positif : canon doit rendre x 13..379 / y 424.5..593.7 CSS (mesure-canon.txt).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0,(430,590)),('fiche19','../capture-fiche-1080x1920.png',2.755,(430,585)),
   ('fiche24','../capture-fiche-1080x2400.png',2.755,(608,760))]
for name,f,fac,(ya,yb) in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h} bande y {ya}..{yb} CSS')
    ys=range(C(ya),C(yb))
    frac=[sum(1 for y in ys if lum(px[x,y])<48)/len(ys) for x in range(w)]
    on=[x for x,v in enumerate(frac) if v>0.55]
    print(f'   colonnes "panneau" (>55% sombre) : x {on[0]/fac:.2f}..{(on[-1]+1)/fac:.2f} CSS  (largeur {(on[-1]+1-on[0])/fac:.2f})')
    # transition fine sur les bords
    print('   profil bord gauche (x CSS: part sombre) :', ', '.join(f'{x/fac:.1f}:{frac[x]:.2f}' for x in range(max(0,on[0]-6),on[0]+7)))
    print('   profil bord droit   :', ', '.join(f'{x/fac:.1f}:{frac[x]:.2f}' for x in range(on[-1]-6,min(w,on[-1]+7))))
    xs=range(on[0]+C(3),on[-1]-C(3))
    fr2=[sum(1 for x in xs if lum(px[x,y])<48)/len(xs) for y in range(h)]
    on2=[y for y,v in enumerate(fr2) if v>0.55]
    # restreindre a la zone proche de la bande
    on2=[y for y in on2 if C(ya)-C(30)<=y<=C(yb)+C(30)]
    print(f'   lignes "panneau" : y {on2[0]/fac:.2f}..{(on2[-1]+1)/fac:.2f} CSS  (hauteur {(on2[-1]+1-on2[0])/fac:.2f})')
    print('   profil bord haut :', ', '.join(f'{y/fac:.1f}:{fr2[y]:.2f}' for y in range(on2[0]-6,on2[0]+7)))
    print('   profil bord bas  :', ', '.join(f'{y/fac:.1f}:{fr2[y]:.2f}' for y in range(on2[-1]-6,min(h,on2[-1]+7))))
