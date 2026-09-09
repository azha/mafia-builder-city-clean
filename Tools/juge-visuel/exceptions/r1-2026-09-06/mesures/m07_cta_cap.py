# m07 — CTA de la CAPTURE par course horizontale (pour ne pas fusionner avec le carré saumon voisin).
from util import *
print("== m07 CTA (capture) ==")
for nom, P in (("SOUS chrome",CAP),("SANS chrome",CAPSC)):
    cap=ouvrir(P); px=cap.load()
    cible=(255,90,77); tol=14
    lignes=[]
    for y in range(1500,2200):
        best=0;cur=0;x0=None;x0b=None
        for x in range(1080):
            c=px[x,y]
            if abs(c[0]-cible[0])<=tol and abs(c[1]-cible[1])<=tol and abs(c[2]-cible[2])<=tol:
                if cur==0:x0=x
                cur+=1
                if cur>best:best=cur;x0b=x0
            else: cur=0
        if best>500: lignes.append((y,best,x0b))
    y0,y1=lignes[0][0],lignes[-1][0]
    print(f"  {nom}: CTA saumon y {y0}..{y1} h={y1-y0+1} ; x0={min(l[2] for l in lignes)} largeur max={max(l[1] for l in lignes)}")
    print(f"     bord : profil VERTICAL x=540 autour du haut : {[(y,px[540,y]) for y in range(y0-5,y0+6)]}")
    print(f"     coins : px aux 4 coins de la bbox = "
          f"{px[min(l[2] for l in lignes),y0]}, {px[min(l[2] for l in lignes)+max(l[1] for l in lignes)-1,y0]}, "
          f"{px[min(l[2] for l in lignes),y1]}, {px[min(l[2] for l in lignes)+max(l[1] for l in lignes)-1,y1]}")
