# m20 — le "filet" (rangée Escalades archivées) de la RÉFÉRENCE, repéré par son LISERÉ (#ffffff2a).
from util import *
print("== m20 filet (référence) ==")
ref=ouvrir(REF); px=ref.load()
cible=(49,54,61); tol=14
pts=[(x,y) for y in range(1900,2102) for x in range(1080)
     if abs(px[x,y][0]-cible[0])<=tol and abs(px[x,y][1]-cible[1])<=tol and abs(px[x,y][2]-cible[2])<=tol]
xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
print(f"  liseré : {len(pts)} px ; bbox=({min(xs)},{min(ys)})-({max(xs)},{max(ys)}) -> {max(xs)-min(xs)+1}x{max(ys)-min(ys)+1}")
y0,y1,x0,x1=min(ys),max(ys),min(xs),max(xs)
print(f"  épaisseur du liseré (profil VERTICAL x=540, bord haut) : {[(y,px[540,y]) for y in range(y0-3,y0+7)]}")
print(f"  épaisseur du liseré (profil HORIZONTAL y={(y0+y1)//2}, bord gauche) : {[(x,px[x,(y0+y1)//2]) for x in range(x0-3,x0+7)]}")
# rayon : première ligne où le liseré atteint x0
prem={}
for (x,y) in pts: prem.setdefault(y,[]).append(x)
for y in sorted(prem)[:26:2]:
    print(f"     y={y} : xmin={min(prem[y])} xmax={max(prem[y])}")
# remplissage intérieur
print(f"  remplissage intérieur (540,{(y0+y1)//2}) = {mediane_fenetre(ref,540,(y0+y1)//2,6)} ; fond hors filet (540,{y0-25}) = {mediane_fenetre(ref,540,y0-25,6)}")
