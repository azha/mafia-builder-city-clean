# m12 : ou vit la masse d'exces hors encre ? (diagnostic du barycentre) + profil radial BRUT.
import sys; sys.path.insert(0,'.')
from lib import *
CYAN=(127,212,217)
def est_cyan(c,tol=28): return abs(c[0]-CYAN[0])<=tol and abs(c[1]-CYAN[1])<=tol and abs(c[2]-CYAN[2])<=tol

def diag(nom,bx0,bx1,dy0,dy1,etiq):
    im=ouvrir(nom); px=im.load()
    print("  == %s ==" % etiq)
    for y in range(dy0,dy1+1):
        row=[lum(px[x,y]) for x in range(bx0,bx1+1)]
        m=mediane(row)
        pos=sum(max(0.0,v-m) for x,v in zip(range(bx0,bx1+1),row) if not est_cyan(px[x,y]))
        nz=sum(1 for x,v in zip(range(bx0,bx1+1),row) if (v-m)>0.5 and not est_cyan(px[x,y]))
        if pos>30:
            print("     y=%4d  mediane=%6.1f  masse d'exces (hors cyan)=%8.0f  colonnes >0,5pt=%3d" % (y,m,pos,nz))
diag('capture-1080x2400.png',52,354,731,807,'jeu2400 c1 — rangees a masse notable')
print()
diag('reference-1080x2102.png',56,356,706,781,'ref c1 — rangees a masse notable')
