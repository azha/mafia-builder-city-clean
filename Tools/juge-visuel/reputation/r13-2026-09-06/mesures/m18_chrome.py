# m18 — LE CHROME contre le canon HUD (hud-canon-1176.png, 1176 px = 392 CSS a x3).
# Echelle : le canon est ramene a l'echelle de la capture par x(1080/1176)/(392/392) — soit le rapport
#   des px par px CSS : capture 1080/392 = 2,755 ; canon 1176/392 = 3,000 -> facteur 0,9184.
# Controle positif : le filet du bandeau doit tomber a la MEME hauteur (141 px cote capture).
# Controle negatif : une bande sous le filet doit differer (le canon y a de l'art de ville, la capture non).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
can=ouvrir('hud-canon-1176.png'); cap=ouvrir('capture-1080x2400.png')
F=1080/1176.0
canr=can.resize((1080,int(can.size[1]*F)))
print(f"  canon ramene : {can.size} -> {canr.size} (facteur {F:.4f})")
pk,pc=px(canr),px(cap)
def filet(p,H):
    for y in range(60,220):
        n=sum(1 for x in range(100,980,4) if p[x,y][0]>110 and p[x,y][2]<130 and p[x,y][0]>p[x,y][2]+40)
        if n>150: return y
    return None
print(f"  filet du bandeau : canon ramene y={filet(pk,canr.size[1])} ; capture y={filet(pc,2400)}"
      f"   [controle positif]")
def lignes(p,box,fond,seuil=40,trou=5):
    x0,y0,x1,y1=box; rows={}
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if dist(p[x,y],fond)>seuil]
        if xs: rows[y]=xs
    ys=sorted(rows); seg=[]
    for y in ys:
        if seg and y-seg[-1][-1]<=trou: seg[-1].append(y)
        else: seg.append([y])
    return [(s[0],s[-1],min(min(rows[y]) for y in s),max(max(rows[y]) for y in s),
             sum(len(rows[y]) for y in s)) for s in seg]
print("\n=== aile GAUCHE (ARGENT) ===")
for nm,p,box in (('canon',pk,(20,10,420,140)),('capture',pc,(20,10,420,140))):
    for a,b,c,d,n in lignes(p,box,(20,24,32)):
        print(f"  {nm:8s} y {a:>3}..{b:<3} h={b-a+1:>3} x {c:>3}..{d:<3} l={d-c+1:>4} n={n}")
print("\n=== aile DROITE (JOUR / heure) ===")
for nm,p,box in (('canon',pk,(700,10,1070,140)),('capture',pc,(700,10,1070,140))):
    for a,b,c,d,n in lignes(p,box,(20,24,32)):
        print(f"  {nm:8s} y {a:>3}..{b:<3} h={b-a+1:>3} x {c:>3}..{d:<3} l={d-c+1:>4} n={n}")
print("\n=== medaillon (couleur de l'anneau, y du centre) ===")
for nm,p in (('canon',pk),('capture',pc)):
    # anneau : px les plus satures sur le cercle, rangee du centre approximative
    best=None
    for y in range(20,180):
        for x in range(430,650):
            c=p[x,y]; s=max(c)-min(c)
            if best is None or s>best[0]: best=(s,c,(x,y))
    print(f"  {nm:8s} px le plus sature de la zone du medaillon : {best[1]} en {best[2]}")
print("\n=== filet du bandeau : couleur ===")
print("  canon  y=filet :", [pk[x,filet(pk,0)] for x in (200,540,900)])
print("  capture y=141  :", [pc[x,141] for x in (200,540,900)])
print("  capture y=138  :", [pc[x,138] for x in (200,540,900)])
print("\n=== dock ===")
for nm,p,H in (('canon',pk,canr.size[1]),('capture',pc,2400)):
    L=lignes(p,(20,H-260,1060,H-10),(20,24,32),seuil=30,trou=6)
    print(f"  {nm:8s} : {[(a,b,c,d) for a,b,c,d,n in L]}")
