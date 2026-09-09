# m30 — pastilles de la bulle (réf) et bandeau doré du comptoir, mesurés hors des colonnes occupées.
from util import *
print("== m30 pastilles + plateau (v2) ==")
ref=ouvrir(REF); pr=ref.load(); cap=ouvrir(CAP)
# pastilles : composantes de px clairs dans y1355..1425
def comps(im,test,fen,minpx=60):
    px=im.load(); x0,y0,x1,y1=fen; vus=set(); out=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if (x,y) in vus or not test(px[x,y]): continue
            pile=[(x,y)];vus.add((x,y));pts=[]
            while pile:
                a,b=pile.pop();pts.append((a,b))
                for da,db in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                    na,nb=a+da,b+db
                    if x0<=na<x1 and y0<=nb<y1 and (na,nb) not in vus and test(px[na,nb]):
                        vus.add((na,nb));pile.append((na,nb))
            if len(pts)>=minpx:
                xs=[q[0] for q in pts];ys=[q[1] for q in pts]
                out.append((min(xs),min(ys),max(xs),max(ys),len(pts)))
    out.sort(key=lambda t:t[0]);return out
clair=lambda c:(c[0]*299+c[1]*587+c[2]*114)/1000>62
cs=comps(ref,clair,(320,1350,1060,1430),minpx=300)
print(f"  RÉF pastilles : {len(cs)} composantes ≥300 px dans y1350..1430")
for t in cs: print(f"     ({t[0]},{t[1]})-({t[2]},{t[3]}) {t[2]-t[0]+1}x{t[3]-t[1]+1} n={t[4]}")
print(f"  CAP même rôle (entre la ligne méta et le corps, y1690..1715) : "
      f"{len(comps(cap,clair,(300,1690,1043,1716),minpx=300))} composantes ≥300 px")
# plateau doré : profil à x=950 (hors médaillons)
print("  RÉF profil VERTICAL x=950, y840..980 (bandeau doré du comptoir) :")
for y in range(840,984,8): print(f"     y={y} -> {mediane_fenetre(ref,950,y,3)}")
# largeur du bandeau doré : ligne y=900
row=[(x,pr[x,900]) for x in range(0,1080,40)]
print("  RÉF ligne y=900 (pas 40) :", row)
