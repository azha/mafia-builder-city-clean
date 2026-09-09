# Profil VERTICAL brut a travers le medaillon (le filet est horizontal et s'arrete a l'anneau :
# une colonne au centre ne le rencontre pas). Sert a poser cy et le rayon vertical.
from common import *
def col(im,x,y0,y1,scale,label):
    px=im.load(); print(f'  {label} colonne x={x} ({x/scale:.2f} CSS)'); prev=None
    for y in range(y0,y1):
        c=px[x,y]; L=lum(c)
        if prev is None or abs(L-prev)>10:
            print(f'     y={y:4d} ({y/scale:6.2f} CSS) {c} L={L:6.1f}')
        prev=L
r=op(REF); col(r,588,10,240,REF_S,'REF x=588 (196 CSS)')
print()
c=op(C24); col(c,540,10,260,CAP_S,'CAP2400 x=540 (196.0 CSS)')
