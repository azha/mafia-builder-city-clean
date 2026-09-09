# Grandeur : hauteur du bandeau (bas du filet) + epaisseur du filet, 2 conventions, sur les 4 images.
# Colonne choisie x=700 px (254 CSS capture / 233 CSS ref) : hors medaillon, hors ailes, hors bloc argent.
from common import *
def bande(im,x,y0,y1,scale,label,cible=(200,126,66),tol=40):
    px=im.load(); ys=[y for y in range(y0,y1) if all(abs(px[x,y][i]-cible[i])<tol for i in range(3))]
    if not ys: print(f'  {label}: AUCUN pixel de la famille {cible} en x={x}'); return
    print(f'  {label} x={x}: filet px y {ys[0]}..{ys[-1]}  = CSS {ys[0]/scale:.2f}..{(ys[-1]+1)/scale:.2f}'
          f'  epaisseur {len(ys)} px = {len(ys)/scale:.2f} CSS ; couleur {px[x,ys[len(ys)//2]]}')
r=op(REF); bande(r,700,100,200,REF_S,'REF (cible laiton 176,141,62)',(176,141,62),45)
bande(r,430,100,200,REF_S,'REF x=430 (cible laiton)',(176,141,62),45)
c=op(C19); bande(c,700,100,230,CAP_S,'CAP1920 fiche')
c2=op(C24); bande(c2,700,100,230,CAP_S,'CAP2400 district')
f=op(F24); bande(f,700,100,230,CAP_S,'CAP2400 fiche-sous-chrome')
t=op(T24); bande(t,700,100,230,CAP_S,'TEMOIN famille (ede6394)')
