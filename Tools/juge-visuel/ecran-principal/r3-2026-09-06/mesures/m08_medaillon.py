# m08 — le medaillon : diametre, anneau (couleur/epaisseur), fond, losange.
# Detection : sur une ligne horizontale passant par le centre presume, on cherche les deux
# transitions "fond de barre -> anneau clair".
# Controle positif : le canon doit rendre 64.0 CSS de diametre (mesure-canon.txt : .medaillon 64x64 a (164,8)).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755),
   ('fiche19','../capture-fiche-1080x1920.png',2.755)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac))
    print(f'== {name} {w}x{h}')
    # scan vertical du centre (x=196 CSS) pour trouver haut/bas de l'anneau
    xc=C(196)
    prof=[(y,px[xc,y]) for y in range(0,C(90))]
    # l'anneau est laiton/orange : r-b eleve ET clair
    ring=[y for y,p in prof if (p[0]-p[2])>35 and p[0]>90]
    print(f'   colonne x=196 CSS : pixels "anneau" y={[round(y/fac,1) for y in ring][:6]} ... {[round(y/fac,1) for y in ring][-6:]}')
    # bornes verticales
    if ring: print(f'   -> haut {ring[0]/fac:.2f} CSS  bas {ring[-1]/fac:.2f} CSS  diametre vertical={(ring[-1]-ring[0]+1)/fac:.2f} CSS')
    # scan horizontal a mi-hauteur du medaillon
    if ring:
        ymid=(ring[0]+ring[-1])//2
        row=[(x,px[x,ymid]) for x in range(C(140),C(255))]
        rr=[x for x,p in row if (p[0]-p[2])>35 and p[0]>90]
        if rr: print(f'   ligne y={ymid/fac:.2f} CSS : anneau x={rr[0]/fac:.2f}..{rr[-1]/fac:.2f} -> diametre horizontal={(rr[-1]-rr[0]+1)/fac:.2f} CSS  centre={(rr[0]+rr[-1])/2/fac:.2f} CSS')
        # epaisseur de l'anneau a gauche
        run=[];cur=None
        for x,p in row:
            hit=(p[0]-p[2])>35 and p[0]>90
            if hit:
                if cur is None: cur=[x,x]
                else: cur[1]=x
            else:
                if cur: run.append(cur); cur=None
        if cur: run.append(cur)
        print('   segments anneau sur cette ligne (CSS):', [(round(a/fac,2),round((b+1-a)/fac,2)) for a,b in run])
        if run:
            a,b=run[0]; xm=(a+b)//2
            print(f'   couleur anneau gauche = {median_win(px,xm,ymid,1)}')
        # fond du boitier au centre
        print(f'   fond boitier (centre, -12 CSS en y) = {median_win(px,C(196),ymid-C(12),3)}')
