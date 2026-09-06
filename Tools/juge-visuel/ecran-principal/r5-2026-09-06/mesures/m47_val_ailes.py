# Verification ciblee : hauteur des CHIFFRES des deux ailes du canon, seuil absolu, colonne par colonne.
from common import *
def prof(im,x0,x1,y0,y1,scale,label,seuil=90):
    px=im.load(); print(f'  {label}')
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if lum(px[x,y])>seuil]
        if ys: print(f'    x={x:4d} y {ys[0]}..{ys[-1]} h={len(range(ys[0],ys[-1]+1))} px = {(ys[-1]-ys[0]+1)/scale:.2f} CSS')
r=op(REF)
prof(r,90,140,55,115,REF_S,'REF "2" de "$ 24 850" (x 90..140)')
prof(r,1035,1070,55,115,REF_S,'REF "2" de "21:40" (x 1035..1070)')
