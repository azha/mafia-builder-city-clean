# m21 — rayon d'arrondi du bouton or : masque "or" (r>140 et r-b>55), min-x par ligne.
# Controle positif : le canon doit rendre r ~= 9 CSS (CSS: .btn{border-radius:9px}).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
CAS=[('canon','../ecran-canon.png',3.0,424.52),('fiche19','../capture-fiche-1080x1920.png',2.755,426.50)]
for name,f,fac,y0 in CAS:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    rows=[]
    for y in range(C(y0+108),C(y0+160)):
        xs=[x for x in range(C(24),C(140)) if px[x,y][0]>140 and px[x,y][0]-px[x,y][2]>55]
        if xs: rows.append((y,xs[0],xs[-1]))
    if not rows: print('   rien'); continue
    ytop=rows[0][0]; ybot=rows[-1][0]
    xl=min(r[1] for r in rows); xr=max(r[2] for r in rows)
    print(f'   bouton or : y {ytop/fac:.2f}..{(ybot+1)/fac:.2f} CSS (h={(ybot+1-ytop)/fac:.2f}) ; x {xl/fac:.2f}..{(xr+1)/fac:.2f} (l={(xr+1-xl)/fac:.2f})')
    print('   retrait gauche par ligne depuis le haut (dy CSS : retrait CSS)')
    for k in range(0,min(40,len(rows))):
        y,a,b=rows[k]
        print(f'      dy={(y-ytop)/fac:5.2f} : retrait={(a-xl)/fac:5.2f}', end='')
        if k%3==2: print()
    print()
