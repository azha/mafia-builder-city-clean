# Meme perimetre, detecteur par COULEUR de l'encre du montant (or-vif (242,201,106)) et du libelle
# (creme-2 (185,173,146)), pour ne pas confondre avec le halo orange de l'anneau.
from common import *
import math
c=op(C24); px=c.load(); CX,CY,R=539.5,130.0,110.5
def proche(pred,label):
    best=None
    for y in range(25,155):
        for x in range(100,470):
            if pred(px[x,y]):
                d=math.hypot(x-CX,y-CY)
                if best is None or d<best[0]: best=(d,x,y,px[x,y])
    if best: print(f'  {label}: pixel le + proche ({best[1]},{best[2]}) {best[3]} a {best[0]:.1f} px du centre ; bord de l anneau {R:.1f} ; ecart {(best[0]-R)/CAP_S:+.2f} CSS')
    else: print(f'  {label}: rien')
proche(lambda c2: c2[0]>215 and c2[1]>170 and c2[2]<150 and c2[1]>c2[2]+40,'montant (or-vif)')
proche(lambda c2: abs(c2[0]-185)<28 and abs(c2[1]-173)<28 and abs(c2[2]-146)<32,'libelle ARGENT (creme-2)')
proche(lambda c2: abs(c2[0]-217)<20 and abs(c2[1]-171)<20 and abs(c2[2]-77)<25,'barre de ratio (--or)')
