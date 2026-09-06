# m03 : 4 reperes ponctuels de la PEINTURE (identiques des deux cotes par construction)
#  L1 rose des vents (blanc tres clair, desature)      L2 parc vert de Marne-Basse
#  L3 pylones du port (barres sombres a pastilles or)  L4 pastille or de la barque
# Chaque repere -> centroide. On en deduit echelle verticale et decalage.
from PIL import Image

def centro(path, box, pred, nom):
    im=Image.open(path).convert('RGB'); px=im.load()
    x0,y0,x1,y1=box; sx=sy=n=0
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(px[x,y]): sx+=x; sy+=y; n+=1; xs.append(x); ys.append(y)
    if n==0: print(f"   {nom}: AUCUN pixel"); return None
    print(f"   {nom}: n={n:5d} centroide=({sx/n:7.1f},{sy/n:7.1f}) bbox=({min(xs)},{min(ys)},{max(xs)},{max(ys)})")
    return (sx/n, sy/n, min(xs),min(ys),max(xs),max(ys), n)

blanc  = lambda p: p[0]>185 and p[1]>185 and p[2]>185 and max(p)-min(p)<45
vert   = lambda p: p[1]>p[0]+14 and p[1]>p[2]+14 and p[1]>45
print("ouverture des deux images")
for path,tag,by in [('reference-1080x2102.png','REF',0),('capture-1080x2400.png','CAP',0)]:
    im=Image.open(path); print(f" {tag} {path} -> {im.size}")

print("L1 rose des vents (blanc desature)")
r1=centro('reference-1080x2102.png',(900,500,1080,700),blanc,'REF')
c1=centro('capture-1080x2400.png',  (900,500,1080,760),blanc,'CAP')
print("L2 parc vert Marne-Basse")
r2=centro('reference-1080x2102.png',(380,1350,700,1500),vert,'REF')
c2=centro('capture-1080x2400.png',  (380,1380,700,1560),vert,'CAP')
print("L2b parc vert Les Friches (bas)")
r2b=centro('reference-1080x2102.png',(380,1830,760,1990),vert,'REF')
c2b=centro('capture-1080x2400.png',  (380,1930,760,2120),vert,'CAP')

print()
for nom,(r,c) in [('rose des vents',(r1,c1)),('parc Marne-Basse',(r2,c2)),('parc Les Friches',(r2b,c2b))]:
    if r and c:
        print(f"  {nom:18s} dx={c[0]-r[0]:+7.1f}  dy={c[1]-r[1]:+7.1f}   x ref={r[0]:.1f} cap={c[0]:.1f}")
if r1 and c1 and r2b and c2b:
    dyr = r2b[1]-r1[1]; dyc = c2b[1]-c1[1]
    print(f"\n  ECHELLE VERTICALE (rose->Friches) : ref {dyr:.1f} px, cap {dyc:.1f} px -> sy = {dyc/dyr:.4f}")
    print(f"  offset dy a la rose : {c1[1]-r1[1]*dyc/dyr:+.1f}")
