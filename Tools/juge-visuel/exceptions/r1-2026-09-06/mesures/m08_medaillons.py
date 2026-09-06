# m08 — la rangée d'attendants : médaillons (réf) vs pavés (capture).
# Contrôle positif : le CSS de la réf donne .attendant.premier .medl = 58 CSS => 58*3.6 = 208,8 px ;
#   l'instrument doit retrouver ~209 px sur l'image. Si non, c'est l'instrument qui est faux.
# Convention de bord : épaisseur = nb de px consécutifs de la couleur du liseré sur un profil
#   perpendiculaire pris au MILIEU du côté.
from util import *
print("== m08 rangée d'attendants ==")

# ---------- RÉFÉRENCE ----------
ref=ouvrir(REF); pr=ref.load()
# les médaillons ont un liseré laiton #b08d3e (176,141,62) ; le premier a --or-vif #f2c96b (242,201,107)
def composantes(im, test, fen, minpx=800):
    """composantes connexes 4-voisins des px satisfaisant test, dans fen"""
    px=im.load(); x0,y0,x1,y1=fen
    vus=set(); comps=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if (x,y) in vus: continue
            if not test(px[x,y]): continue
            pile=[(x,y)]; vus.add((x,y)); pts=[]
            while pile:
                a,b=pile.pop(); pts.append((a,b))
                for da,db in ((1,0),(-1,0),(0,1),(0,-1)):
                    na,nb=a+da,b+db
                    if x0<=na<x1 and y0<=nb<y1 and (na,nb) not in vus and test(px[na,nb]):
                        vus.add((na,nb)); pile.append((na,nb))
            if len(pts)>=minpx:
                xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
                comps.append((min(xs),min(ys),max(xs),max(ys),len(pts)))
    comps.sort(key=lambda c:c[0])
    return comps

# le fond intérieur du médaillon est bleu foncé #243048->#0f1622 : test = bleu dominant et sombre
def bleu_medl(c):
    return c[2]>c[0]+8 and 20<=c[2]<=95 and c[0]<70
c=composantes(ref, bleu_medl, (0,700,1080,1120), minpx=3000)
print(f"  RÉF composantes 'intérieur de médaillon' (bleu sombre) dans y 700..1120 : {len(c)}")
for t in c: print(f"     bbox=({t[0]},{t[1]})-({t[2]},{t[3]})  {t[2]-t[0]+1}x{t[3]-t[1]+1}  n={t[4]}")
