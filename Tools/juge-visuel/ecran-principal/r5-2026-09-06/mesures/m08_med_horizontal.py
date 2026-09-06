# Profil HORIZONTAL a la hauteur du centre du medaillon (pas de filet a cette hauteur).
from common import *
def lig(im,y,x0,x1,scale,label):
    px=im.load(); print(f'  {label} ligne y={y} ({y/scale:.2f} CSS)'); prev=None
    for x in range(x0,x1):
        c=px[x,y]; L=lum(c)
        if prev is None or abs(L-prev)>10:
            print(f'     x={x:4d} ({x/scale:6.2f} CSS) {c} L={L:6.1f}')
        prev=L
r=op(REF); lig(r,116,520,660,REF_S,'REF y=116 (38.7 CSS, centre anneau)')
print()
c=op(C24); lig(c,130,420,680,CAP_S,'CAP2400 y=130 (47.2 CSS, centre anneau)')
print()
t=op(T24); lig(t,130,420,680,CAP_S,'TEMOIN famille y=130')
