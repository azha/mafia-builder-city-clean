# m20 — separateurs de stats (x attendus 140.67 et 251.33 CSS) et bordures des boutons "ligne"
# (bords de boite attendus : 143.67/248.33 et 257.33/362 CSS). Rayon du bouton or.
# Controle positif : le canon doit rendre un pic de 1 CSS a 140.7 et 251.7 (mesure m19).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
CAS=[('canon','../ecran-canon.png',3.0,424.52,116.5),('fiche19','../capture-fiche-1080x1920.png',2.755,426.50,113.6)]
for name,f,fac,y0,btop in CAS:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    for rel in (72,88,96):
        y=C(y0+rel)
        for xc in (140.7,251.3):
            print(f'   sep rel {rel} autour x={xc}: ' + ', '.join(f'{x/fac:.1f}:{lum(px[x,y]):.0f}' for x in range(C(xc-3),C(xc+3.5))))
    for xc,lbl in ((143.7,'btn2 gauche'),(248.3,'btn2 droite'),(257.3,'btn3 gauche'),(362.0,'btn3 droite')):
        y=C(y0+135)
        print(f'   {lbl} : ' + ', '.join(f'{x/fac:.1f}:{lum(px[x,y]):.0f}' for x in range(C(xc-3),C(xc+3.5))))
    print('   bouton or, bord haut (x du 1er pixel L>110 par ligne) :')
    for d in [x*0.5 for x in range(-4,20)]:
        rel=btop+d; yy=C(y0+rel)
        xs=[x for x in range(C(24),C(140)) if lum(px[x,yy])>110]
        print(f'      rel {rel:6.2f} : ' + (f'x {xs[0]/fac:6.2f}..{xs[-1]/fac:6.2f}' if xs else '-'))
