# m03 — la ligne de balayage (teal) : position, epaisseur, etendue, et ce qu'elle traverse.
# Convention : exces(x,y) = teal(x,y) - mediane de teal(x, .) sur y+-[10..40] PRIVE de la ligne.
#   teal(c) = (g+b)/2 - r.   La mediane par COLONNE absorbe la matiere traversee (cheveux, fond, carte).
# Controle positif : une rangee de fond a 200 px de la ligne doit rendre un exces ~0 (et non ~12, ce que
#   rend une mesure sans ligne de base par colonne — piege verifie ici meme).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def teal(c): return (c[1]+c[2])/2.0 - c[0]

def base_col(p, x, y, demi=40, garde=8):
    vals = [teal(p[x,yy]) for yy in range(y-demi, y+demi+1) if abs(yy-y) > garde]
    vals.sort(); return vals[len(vals)//2]

def analyse(im, nom, ycent, x0, x1):
    p = px(im); W,H = im.size
    # 1. rangee de pic : moyenne de l'exces par rangee
    best=None
    for y in range(ycent-60, ycent+60):
        s = sum(teal(p[x,y]) - base_col(p,x,y) for x in range(x0,x1,7))
        m = s/len(range(x0,x1,7))
        if best is None or m > best[1]: best=(y,m)
    ypic, mpic = best
    print(f"\n=== {nom} — balayage ===")
    print(f"  rangee de pic y={ypic}  exces moyen par rangee={mpic:.2f}")
    ep = []
    for y in range(ypic-12, ypic+13):
        s = sum(teal(p[x,y]) - base_col(p,x,y) for x in range(x0,x1,7))
        m = s/len(range(x0,x1,7))
        if m >= 0.5*mpic: ep.append(y)
    print(f"  epaisseur (>=50% de la rangee de pic) : y {min(ep)}..{max(ep)} = {len(ep)} px")
    exc = [teal(p[x,ypic]) - base_col(p,x,ypic) for x in range(W)]
    mx = max(exc)
    print(f"  pic d'exces (par colonne) = {mx:.1f}")
    res={}
    for frac in (0.25,0.10):
        xs=[x for x,v in enumerate(exc) if v>=frac*mx]
        res[frac]=(min(xs),max(xs),max(xs)-min(xs)+1)
        print(f"  etendue a {int(frac*100)}% : x {min(xs)}..{max(xs)} = {max(xs)-min(xs)+1} px")
    return ypic, mx, res, exc

ref = ouvrir('reference-1080x2102.png')
cap = ouvrir('capture-1080x2400.png')
cap19 = ouvrir('capture-1080x1920.png')
r = analyse(ref,'REFERENCE', 1090, 120, 960)
c = analyse(cap,'CAPTURE 2400', 1104, 120, 960)
c19 = analyse(cap19,'CAPTURE 1920', 784, 120, 960)
# controle positif
for im,nom,y in ((ref,'REF',1300),(cap,'CAP2400',1340)):
    p=px(im)
    v=[teal(p[x,y])-base_col(p,x,y) for x in range(600,900)]
    print(f"  [controle positif] {nom} exces moyen a y={y} (loin de la ligne) : {sum(v)/len(v):.2f}")
