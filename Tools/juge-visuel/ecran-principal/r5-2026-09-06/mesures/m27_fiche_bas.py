# Grandeur : bord BAS du panneau .fiche (colonne au centre), et son ecart au dock.
from common import *
def col_bas(im,x,y0,y1,scale,label,seuil=28):
    px=im.load(); prev=None; runs=[]
    for y in range(y0,y1):
        v=lum(px[x,y]); s=v<seuil
        if prev is None or s!=prev:
            runs.append((y,s)); prev=s
    print(f'  {label} colonne x={x} ({x/scale:.2f} CSS) transitions sombre<{seuil} :')
    for y,s in runs: print(f'     y={y} ({y/scale:7.2f} CSS) -> {"SOMBRE" if s else "clair"}')
r=op(REF); col_bas(r,590,1770,1830,REF_S,'REF bas de fiche')
c=op(C19); col_bas(c,540,1540,1640,CAP_S,'CAP1920 bas de fiche')
