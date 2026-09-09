# m09 — pivot (disque laiton) : centre et taille. Controle : le canon pose r=2,6 vb x0,7333 = 1,91 CSS (D=3,81)
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m09 pivot du cadran ===')
def laitonish(c):
    r,g,b=c; return r>120 and 90<g<200 and b<130 and r-b>50 and g>b+20 and g>=0.66*r

CFG=[(CANON,'canon',SC_CANON,(520,60,660,190)),
     (DIST,'district2400',SC_CAPT,(480,50,600,175)),
     (F1920,'fiche1920',SC_CAPT,(480,50,600,175))]
for path,nom,sc,(x0,y0,x1,y1) in CFG:
    im=ouvrir(path,nom); px=im.load()
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if laitonish(px[x,y])]
    if not pts: print('   aucun pixel'); continue
    # composante connexe la plus grosse (le pivot)
    S=set(pts); vus=set(); best=[]
    for p in pts:
        if p in vus: continue
        pile=[p]; comp=[]
        vus.add(p)
        while pile:
            q=pile.pop(); comp.append(q)
            for d in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                n=(q[0]+d[0],q[1]+d[1])
                if n in S and n not in vus: vus.add(n); pile.append(n)
        if len(comp)>len(best): best=comp
    xs=[p[0] for p in best]; ys=[p[1] for p in best]
    cx=sum(xs)/len(best); cy=sum(ys)/len(best)
    aire=len(best); deq=2*math.sqrt(aire/math.pi)
    print('   [%s] pivot : %d px, centre (%.2f, %.2f) px = (%.2f, %.2f) CSS ; bbox %.2f x %.2f CSS ; D equivalent %.2f CSS'
          % (nom,aire,cx,cy,cx/sc,cy/sc,(max(xs)-min(xs)+1)/sc,(max(ys)-min(ys)+1)/sc,deq/sc))
