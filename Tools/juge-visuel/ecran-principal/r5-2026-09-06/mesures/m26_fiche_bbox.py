# Grandeur : bbox du panneau .fiche par CONTRASTE au fond (art) — colonnes et lignes.
# Le panneau est nettement plus sombre que l'art ; on cherche la frontiere sur plusieurs lignes/colonnes.
from common import *
def bbox(im,box,scale,label,seuil=28):
    px=im.load(); x0,y0,x1,y1=box
    # frontiere verticale : sur la ligne mediane du panneau, ou passe-t-on du clair (art) au sombre
    ymid=(y0+y1)//2
    print(f'  {label}')
    for ym in (y0+40,ymid,y1-40):
        row=[lum(px[x,ym]) for x in range(x0,x1)]
        g=None;d=None
        for i,v in enumerate(row):
            if v<seuil and g is None: g=x0+i
            if v<seuil: d=x0+i
        print(f'     ligne y={ym} ({ym/scale:6.2f} CSS) : panneau x {g}..{d} = {g/scale:7.2f}..{(d+1)/scale:7.2f} CSS (l={(d-g+1)/scale:6.2f})')
    for xm in ((x0+x1)//2-150,(x0+x1)//2,(x0+x1)//2+150):
        col=[lum(px[xm,y]) for y in range(y0,y1)]
        h=None;b=None
        for i,v in enumerate(col):
            if v<seuil and h is None: h=y0+i
            if v<seuil: b=y0+i
        print(f'     colonne x={xm} ({xm/scale:6.2f} CSS) : panneau y {h}..{b} = {h/scale:7.2f}..{(b+1)/scale:7.2f} CSS (h={(b-h+1)/scale:6.2f})')
r=op(REF); bbox(r,(20,1265,1160,1800),REF_S,'REF fiche (attendu x 13..379 CSS, y 424.5..593.7, 366x169.19)')
c=op(C19); bbox(c,(20,1110,1060,1700),CAP_S,'CAP1920 fiche')
