# Perimetre de l'ASSUME F3 : "ce qui le ferait sortir = qu'il touche ou recouvre le medaillon".
# On mesure la distance minimale entre l'encre du bloc ARGENT et l'anneau du medaillon (cercle r=110.5 px).
from common import *
import math
c=op(C24); px=c.load()
CX,CY,R=539.5,130.0,110.5
best=None
for y in range(25,150):
    for x in range(100,470):
        d=math.hypot(x-CX,y-CY)
        if d>R*1.02 and lum(px[x,y])>90:   # encre claire STRICTEMENT hors du medaillon
            if best is None or d<best[0]: best=(d,x,y,px[x,y])
print(f'  encre du bloc ARGENT la plus proche : ({best[1]},{best[2]}) {best[3]} a {best[0]:.1f} px du centre')
print(f'  bord exterieur de l anneau = {R:.1f} px ; ecart = {best[0]-R:.1f} px = {(best[0]-R)/CAP_S:.2f} CSS')
# et la reference, pour comparaison
r=op(REF); px2=r.load(); RX,RY,RR=587.5,116.5,95.5
best2=None
for y in range(25,140):
    for x in range(20,480):
        d=math.hypot(x-RX,y-RY)
        if d>RR*1.02 and lum(px2[x,y])>90:
            if best2 is None or d<best2[0]: best2=(d,x,y,px2[x,y])
print(f'  REF : encre la plus proche ({best2[1]},{best2[2]}) {best2[3]} a {best2[0]:.1f} px ; ecart {(best2[0]-RR)/REF_S:.2f} CSS')
