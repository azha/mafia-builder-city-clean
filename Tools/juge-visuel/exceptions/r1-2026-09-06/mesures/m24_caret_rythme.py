# m24 — (a) caret ▼ de sélection (réf) et son absence en capture ; (b) rythme vertical des deux piles.
# Contrôle positif : dans la réf, le caret est en --or-vif #f2c96b -> la sonde or DOIT le trouver
#   juste au-dessus du 1er médaillon. Contrôle négatif : la même sonde au-dessus du 2e médaillon
#   (pas de caret) doit rendre 0.
from util import *
import colorsys
print("== m24 caret + rythme ==")
ref=ouvrir(REF); cap=ouvrir(CAP)
def or_px(im,fen):
    px=im.load(); x0,y0,x1,y1=fen; pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; h,s,v=colorsys.rgb_to_hsv(c[0]/255,c[1]/255,c[2]/255)
            if 33/360<=h<=58/360 and s>=0.35 and v>=0.55: pts.append((x,y))
    return pts
p=or_px(ref,(150,720,270,790)); print(f"  RÉF caret (au-dessus du médaillon 1, x150..270 y720..790) : {len(p)} px or"
      + (f" bbox=({min(q[0] for q in p)},{min(q[1] for q in p)})-({max(q[0] for q in p)},{max(q[1] for q in p)})" if p else ""))
p2=or_px(ref,(400,720,560,790)); print(f"  RÉF contrôle − (au-dessus du médaillon 2) : {len(p2)} px or")
p3=or_px(cap,(0,1280,1080,1360)); print(f"  CAP même zone (au-dessus des pavés, y1280..1360, toute la largeur) : {len(p3)} px or")

print("\n  -- rythme vertical : bornes des blocs, mesurées, et écarts --")
CAPB=[("titre",1292,1331),("pavés",1359,1503),("rails",1505,1521),("noms",1528,1562),("tags",1573,1600),
      ("bulle+carré",1628,1802),("CTA",1831,1977),("archives",2007,2115)]
prev=None
for n,a,b in CAPB:
    g=f" écart au bloc précédent = {a-prev} px" if prev is not None else ""
    print(f"   CAP {n:12s} y{a}..{b}  h={b-a+1}{g}")
    prev=b
REFB=[("ligne-soir",666,700),("médaillon 1",804,1006),("rails",1019,1035),("noms",1045,1080),
      ("tags",1090,1160),("bulle",1190,1574),("tampon",1683,1890),("filet",1919,2053)]
prev=None
for n,a,b in REFB:
    g=f" écart = {a-prev} px" if prev is not None else ""
    print(f"   RÉF {n:12s} y{a}..{b}  h={b-a+1}{g}")
    prev=b
