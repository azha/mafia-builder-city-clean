# m19 — (a) variance du fond de panneau (l'art transparait-il ?) ; (b) separateurs de stats ;
# (c) bordure des boutons "ligne" ; (d) rayon d'arrondi du bouton or ; (e) rayon du panneau.
# Controle positif : canon .btn.ligne border #ffffff2a sur fond ~ (12,19,32) -> attendu ~ (23,30,42).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
CAS=[('canon','../ecran-canon.png',3.0,424.52,(161.7,230.0)),('fiche19','../capture-fiche-1080x1920.png',2.755,426.50,(158.3,232.7))]
for name,f,fac,y0,(bx0,bx1) in CAS:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    # (a) variance du fond : grille 12x6 dans les zones sans texte
    vals=[]
    for cx in range(20,375,12):
        for cy in (5,8,58,63,103,108,160,165):
            p=median_win(px,C(cx),C(y0+cy),2)
            if lum(p)<60: vals.append((cx,cy,p))
    Ls=[lum(p) for _,_,p in vals]
    print(f'   fond panneau : n={len(vals)} sondes ; L min={min(Ls):.1f} max={max(Ls):.1f} median={med(Ls):.1f} etendue={max(Ls)-min(Ls):.1f}')
    ext=[(cx,cy,p,round(lum(p),1)) for cx,cy,p in vals if lum(p)==min(Ls) or lum(p)==max(Ls)]
    print('      extremes :', ext[:4])
    # (b) separateurs : profil horizontal a mi-hauteur du bloc stats (rel 88)
    y=C(y0+88); row=[(x,lum(px[x,y])) for x in range(C(30),C(362))]
    base=med([L for _,L in row])
    pk=[(x/fac,L) for x,L in row if L>base+3]
    print(f'   separateurs (rel 88) : fond L={base:.1f} ; pixels L>fond+3 : {[(round(a,1),round(b,1)) for a,b in pk][:24]}')
    # (c) bordure du bouton "ligne" : colonne verticale traversant le bord gauche du bouton 2
    print(f'   bouton ligne, bord gauche : profil x autour de {bx0:.0f} CSS (rel 135)')
    yy=C(y0+135)
    print('      ', ', '.join(f'{x/fac:.1f}:{lum(px[x,yy]):.0f}' for x in range(C(bx0-14),C(bx0+4))))
    # (d) rayon du bouton or : sur la 1ere ligne du bouton, ou commence l'or ?
    print('   bouton or : x du 1er pixel clair par ligne (rel 116..128)')
    for rel in [116,117,118,119,120,121,123,125,128]:
        yy=C(y0+rel)
        xs=[x for x in range(C(25),C(140)) if lum(px[x,yy])>110]
        if xs: print(f'      rel {rel:3d} : x0={xs[0]/fac:6.2f}  x1={xs[-1]/fac:6.2f}')
        else: print(f'      rel {rel:3d} : -')
