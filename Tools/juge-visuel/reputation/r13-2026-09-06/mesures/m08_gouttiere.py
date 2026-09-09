# m08 — LA GOUTTIERE : bandeau, cadre, CTA, dock — sous chrome, aux deux resolutions (B1 du lot).
# Convention de bord : ENCRE := px dont la distance de Chebyshev au fond de SA rangee (mediane des
#   colonnes 0..14 et 1066..1079) depasse 18. Un filet OR := row/colonne satisfaisant le predicat d'or
#   (r>120, g>90, b<120, r>b+55, r>=g) sur plus de 55 % de sa longueur.
# Controle positif : le filet du bandeau doit tomber a y=141 aux deux resolutions (r12 m32).
# Controle negatif : la bande entre bandeau et cadre a 2400 est-elle VIDE ? (0 px d'encre attendu ;
#   ce qui y traine est nomme).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def fondrang(p,y):
    v=[[],[],[]]
    for x in list(range(0,15))+list(range(1066,1080)):
        c=p[x,y]
        for k in range(3): v[k].append(c[k])
    return tuple(sorted(a)[len(a)//2] for a in v)
def est_or(c):
    r,g,b=c
    return r>120 and g>90 and b<120 and r>b+55 and r>=g

def etude(f, nom, H, ycta):
    im=ouvrir(f); p=px(im)
    print(f"\n=== {nom} ===")
    for y in range(100,200):
        n=sum(1 for x in range(60,1020,4) if dist(p[x,y],fondrang(p,y))>18)
        if n>200: ybas=y; print(f"  filet du bandeau y={ybas}  [controle positif : 141]"); break
    lignes=[y for y in range(ybas,H) if sum(1 for x in range(0,1080,2) if est_or(p[x,y]))*2 >= 594]
    grp=[]
    for y in lignes:
        if grp and y==grp[-1][-1]+1: grp[-1].append(y)
        else: grp.append([y])
    print(f"  filets or pleine largeur : {[(g[0],g[-1]) for g in grp]}")
    for x in (19,1060):
        ext=[y for y in range(ybas,H) if est_or(p[x,y])]
        seg=[]
        for y in ext:
            if seg and y==seg[-1][-1]+1: seg[-1].append(y)
            else: seg.append([y])
        print(f"  rail vertical du CADRE a x={x} : segments {[(s[0],s[-1]) for s in seg if len(s)>5]}")
    # dock : premiere encre strictement SOUS le bas du cadre
    e={}
    for y in range(ycta, H):
        b=fondrang(p,y); e[y]=sum(1 for x in range(0,1080) if dist(p[x,y],b)>18)
    dock=[y for y in sorted(e) if e[y]>=25]
    print(f"  premiere encre du DOCK (recherche a partir de y={ycta}) : y={min(dock)} ({e[min(dock)]} px)")
    print(f"  ZONE LIBRE bandeau->dock : {ybas+1}..{min(dock)-1} = {min(dock)-1-ybas} px")
    return ybas, min(dock), grp

etude('capture-1080x2400.png','CAPTURE 2400 sous chrome',2400,2115)
etude('capture-1080x1920.png','CAPTURE 1920 sous chrome',1920,1660)
im=ouvrir('capture-1080x2400.png'); p=px(im)
nz=[]
for y in range(150,480):
    b=fondrang(p,y); n=sum(1 for x in range(1080) if dist(p[x,y],b)>18)
    if n: nz.append((y,n))
print(f"\n  [controle negatif] 2400, bande morte y150..479 : {330-len(nz)} rangees VIDES / 330 ;"
      f" les non vides vont de y={nz[0][0]} a y={nz[-1][0]}")
xs=[(x,y) for y,_ in nz for x in range(1080) if dist(p[x,y],fondrang(p,y))>18]
print(f"    encre residuelle : bbox x {min(a for a,b in xs)}..{max(a for a,b in xs)},"
      f" y {min(b for a,b in xs)}..{max(b for a,b in xs)} ; {len(xs)} px")
