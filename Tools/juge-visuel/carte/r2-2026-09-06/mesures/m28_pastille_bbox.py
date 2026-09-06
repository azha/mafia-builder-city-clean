# m28 — geometrie exacte de la pastille "Chaleur : affichee" et de la tour peinte voisine,
#       pour trancher le PERIMETRE de l'ARBITRAGE (recouvre-t-elle un repere peint ?).
# La plaque est un gris neutre (71,76,81) : je la detecte par ce gris, pas par la luminance.
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
print("OUVERT cap",cap.size,"ref",ref.size)
CP=cap.load(); RP=ref.load()
def plaque(p):
    R,G,B=p; return abs(R-71)<=12 and abs(G-76)<=12 and abs(B-81)<=12
pts=[(x,y) for y in range(2040,2152) for x in range(0,400) if plaque(CP[x,y])]
xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
print(f"PLAQUE : {len(pts)} px ; boite x {x0}..{x1} y {y0}..{y1}  ({x1-x0+1} x {y1-y0+1} px)")
print(f"   coins : (x0,y0)={CP[x0,y0]} (x1,y0)={CP[x1,y0]} (x0,y1)={CP[x0,y1]} (x1,y1)={CP[x1,y1]}")
# rayon d'arrondi : la plaque est-elle pleine des le coin ?
plein=all(plaque(CP[x0+i,y0+i]) for i in range(0,4))
print(f"   plaque pleine sur la diagonale du coin haut-gauche (4 px) : {plein} => rayon ~0")
print(f"   marge au bord gauche de l'ecran : {x0} px")
# la tour blanche voisine (rectangle clair peint)
tour=[(x,y) for y in range(2040,2130) for x in range(60,160)
      if CP[x,y][2]>110 and CP[x,y][2]-CP[x,y][0]>10]
if tour:
    ty=[p[1] for p in tour]; tx=[p[0] for p in tour]
    print(f"TOUR peinte voisine : x {min(tx)}..{max(tx)} y {min(ty)}..{max(ty)}")
    print(f"   recouvrement vertical avec la plaque : {'OUI' if min(ty)<=y1 and max(ty)>=y0 else 'NON'} "
          f"(tour finit a y={max(ty)}, plaque commence a y={y0})")
# la plaque recouvre-t-elle un nom ?
NOMS={"LA CHANCELLERIE":(56,1934,270,2017),"LES FRICHES":(451,1953,605,1993),"PONT-GRIS":(840,1944,970,1974)}
print("   noms dont la boite croise celle de la plaque :",
      [n for n,(a,b,c,d) in NOMS.items() if not (d<y0 or b>y1 or c<x0 or a>x1)])
# encre de la plaque
enc=[CP[x,y] for y in range(y0,y1+1) for x in range(x0,x1+1) if CP[x,y]==(255,255,255)]
print(f"   px blanc pur DANS la plaque : {len(enc)}")
print("\nLA LISIERE cote REFERENCE — pourquoi je n'en donne pas d'angle")
def diag(box):
    x0,y0,x1,y1=box
    ps=[(x,y) for y in range(y0,y1+1) for x in range(x0,x1+1)
        if 0.2126*RP[x,y][0]+0.7152*RP[x,y][1]+0.0722*RP[x,y][2]>110 and 10<=(RP[x,y][0]-RP[x,y][2])<=150 and RP[x,y][1]>100]
    cols={}
    for x,y in ps: cols.setdefault(x,[]).append(y)
    ks=sorted(k for k in cols if (max(cols[k])-min(cols[k])+1)>=11)
    if len(ks)<15: return None
    P=[(k,max(cols[k])) for k in ks]
    n=len(P);mx=sum(p[0] for p in P)/n;my=sum(p[1] for p in P)/n
    sxy=sum((p[0]-mx)*(p[1]-my) for p in P);sxx=sum((p[0]-mx)**2 for p in P)
    a=sxy/sxx
    import math
    res=statistics.pstdev([p[1]-(my+a*(p[0]-mx)) for p in P])
    hs=[]
    for i in range(0,max(1,len(ks)-7),4):
        sl=[y for k in ks[i:i+8] for y in cols[k]]; hs.append(max(sl)-min(sl)+1)
    hs.sort()
    return round(math.degrees(math.atan(a)),2), round(res,2), hs[len(hs)//2], len(ps)
for b in [(800,1595,1010,1660),(820,1600,1000,1650),(830,1605,995,1645),(835,1610,990,1642)]:
    r=diag(b)
    print(f"   fenetre {b} -> {r}   (angle, residu, hcap, n)")
print("   source : rotate(-7) ; capitale attendue ~19 px (font-size 7,4 au lieu de 6,6 : quartier 'mien')")
