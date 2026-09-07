# m10 : bornes hautes/basses de la BOITE 1 (detecteur de trait horizontal long).
import sys; sys.path.insert(0,'.')
from lib import *
CAS=[('reference-1080x2102.png', 650, 860, 55, 356),
     ('capture-1080x2400.png',   670, 900, 52, 354),
     ('capture-1080x1920.png',   440, 670, 52, 354)]
for nom,ya,yb,xa,xb in CAS:
    im=ouvrir(nom); px=im.load()
    print("   boite 1 : x=%d..%d" % (xa,xb))
    for y in range(ya,yb):
        row=[lum(px[x,y]) for x in range(xa,xb)]
        m=mediane(row)
        n=sum(1 for v in row if v-m>1.5)
        if n > 0.85*(xb-xa):
            print("      trait horizontal y=%d  (n=%d/%d)  couleur=%s  L=%.1f" % (y,n,xb-xa,mediane_fenetre(px,(xa+xb)//2,y,0),m))
    print()
