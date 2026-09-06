# Profil vertical brut de la zone du filet, colonne par colonne, sur les 4 images.
from common import *
def prof(im,x,y0,y1,scale,label):
    px=im.load(); print(f'  {label} x={x} ({x/scale:.1f} CSS)')
    for y in range(y0,y1):
        c=px[x,y]; print(f'     y={y:4d} ({y/scale:6.2f} CSS)  {c}  L={lum(c):6.1f}')
r=op(REF); prof(r,700,145,162,REF_S,'REF')
c=op(C19); prof(c,700,150,178,CAP_S,'CAP1920')
c2=op(C24); prof(c2,700,150,178,CAP_S,'CAP2400 district')
t=op(T24); prof(t,700,130,152,CAP_S,'TEMOIN famille')
