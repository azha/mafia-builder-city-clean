# Grandeur (1080x2400 seulement) : etendue des bandes de fond declare au-dessus/au-dessous de l'art natif.
from common import *
def bandes(im,x,scale,label):
    px=im.load(); prev=None; print(f'  {label} colonne x={x}')
    for y in range(0,im.height):
        c=px[x,y]
        if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>6:
            print(f'     y={y:4d} ({y/scale:7.2f} CSS) {c} L={lum(c):6.1f}')
        prev=c
c=op(C24); bandes(c,20,CAP_S,'CAP2400 district, x=20 (7.3 CSS)')
