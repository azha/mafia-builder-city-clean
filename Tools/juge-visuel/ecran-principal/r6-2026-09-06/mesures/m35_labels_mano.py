# m35 — libelles du manometre : boite, couleur (echantillonnee au COEUR d'un trait), coin le plus
#   eloigne du centre du boitier (en R), degagement a la lunette / au cerclage interieur.
from lib import *
import math, json
C=json.load(open('centres.json'))
def box(im,x0,y0,x1,y1,s,label,rel=0.45):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(ls); bg=srt[len(srt)//3]; pk=srt[-max(1,len(srt)//150)]
    thr=bg+rel*(pk-bg)
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(im.getpixel((x,y)))>=thr]
    if not pts: print(f"    {label}: RIEN"); return None
    X0,X1,Y0,Y1=min(p[0] for p in pts),max(p[0] for p in pts),min(p[1] for p in pts),max(p[1] for p in pts)
    # couleur au coeur : pixel le plus clair et ses voisins a >=95% de sa luminance
    core=[p for p in pts if lum(im.getpixel(p))>=0.97*max(lum(im.getpixel(q)) for q in pts)]
    col=tuple(int(median([im.getpixel(p)[k] for p in core])) for k in range(3))
    print(f"    {label}: CSS x {X0/s:.2f}..{X1/s:.2f} (largeur {(X1-X0+1)/s:.2f}) y {Y0/s:.2f}..{Y1/s:.2f} "
          f"(hauteur {(Y1-Y0+1)/s:.2f})  couleur au coeur {col} (n coeur={len(core)}) seuil {thr:.1f}")
    return X0,Y0,X1,Y1
def corner(box_,cx,cy,R,label):
    X0,Y0,X1,Y1=box_
    d=max(math.hypot(x-cx,y-cy) for x in (X0,X1) for y in (Y0,Y1))
    print(f"       coin le plus eloigne du centre du boitier : {d:.1f} px = {d/R:.3f} R")
    return d/R
print("== m35 libelles du manometre ==")
c=load(CAP19); r=load(REF)
rc=C['ref']; cc=C['cap19']
b=box(r,480,90,700,140,S_REF,'REF « 37% »');  corner(b,*rc,'')
b=box(r,520,140,680,175,S_REF,'REF « HEAT »'); corner(b,*rc,'')
b=box(c,400,110,690,155,S_CAP,'JEU « Brulant »'); corner(b,*cc,'')
b=box(c,400,152,690,185,S_CAP,'JEU « CHALEUR »'); corner(b,*cc,'')
print()
print("  rappel : bord INTERIEUR du cerclage (mi-amplitude) = 0.958 R au canon (30.63/31.07 ; m14)")
print("           bord INTERIEUR du cerclage jeu = 0.953 R (31.17/32.73 ; m14) ; lunette canon a 0.873 R, ABSENTE en jeu")
