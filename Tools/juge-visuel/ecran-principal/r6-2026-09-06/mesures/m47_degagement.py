# m47 — degagement ARGENT <-> medaillon : bord droit de l'encre (medaillon exclu) vs premier pixel
#   du halo du cerclage sur la MEME ligne, cherche EN PARTANT DE L'ENCRE VERS LA DROITE.
# Convention : "pied du halo" = premier x ou (R-B) depasse le fond local de 8 (seuil bas assume).
from lib import *
import math, json
C=json.load(open('centres.json'))
def run(im,key,s,label):
    cx,cy,R=C[key]
    # bord droit de l'encre du montant, hors disque du medaillon (1.12 R)
    cand=[(x,y) for y in range(55,125) for x in range(380,480) if math.hypot(x-cx,y-cy)>1.12*R]
    ls=sorted(lum(im.getpixel(p)) for p in cand); bg=ls[len(ls)//4]; pk=ls[-max(1,len(ls)//50)]
    thr=bg+0.5*(pk-bg)
    ink=[p for p in cand if lum(im.getpixel(p))>=thr]
    far=max(ink,key=lambda p:p[0]); y=far[1]
    # fond local de goldness sur cette ligne, juste a droite de l'encre
    xs=list(range(far[0]+2,int(cx)))
    g=[im.getpixel((x,y))[0]-im.getpixel((x,y))[2] for x in xs]
    base=median(sorted(g)[:max(3,len(g)//3)])
    foot=None
    for i,v in enumerate(g):
        if v>=base+8: foot=xs[i]; break
    print(f"    {label}: encre la plus a droite x={far[0]} ({far[0]/s:.2f} CSS) a y={y} ({y/s:.2f} CSS)")
    print(f"       fond de goldness sur la ligne = {base:.1f} ; pied du halo (base+8) a x={foot} ({foot/s:.2f} CSS)")
    print(f"       >>> DEGAGEMENT = {(foot-far[0])/s:.2f} CSS")
    # rappel geometrique : bord exterieur NOMINAL du cerclage a cette hauteur
    dy=abs(y-cy); Rout=33.72*s if key!='ref' else 31.98*S_REF
    xg=(cx-math.sqrt(max(0,Rout**2-dy**2)))/s
    print(f"       (reference geometrique : bord exterieur nominal du cerclage a x={xg:.2f} CSS)")
print("== m47 degagement ARGENT <-> medaillon ==")
for p,nm,key in [(CAP19,'JEU 1920','cap19'),(CAP24,'JEU 2400','dis24')]:
    run(load(p),key,S_CAP,nm)
