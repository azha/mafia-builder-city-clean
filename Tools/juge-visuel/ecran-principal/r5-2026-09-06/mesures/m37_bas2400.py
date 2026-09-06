# Bas de l'image 1080x2400 : fin de l'art natif, bande de fond declare, dock.
from common import *
def bandes(im,x,y0,y1,scale,label):
    px=im.load(); prev=None; print(f'  {label} colonne x={x}')
    for y in range(y0,y1):
        c=px[x,y]
        if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>5:
            print(f'     y={y:4d} ({y/scale:7.2f} CSS) {c} L={lum(c):6.1f}')
        prev=c
c=op(C24); bandes(c,20,2050,2400,CAP_S,'CAP2400 x=20')
print()
bandes(c,1060,2050,2400,CAP_S,'CAP2400 x=1060')
