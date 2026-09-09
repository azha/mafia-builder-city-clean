# -*- coding: utf-8 -*-
"""Jeu entre le montant du bandeau et le disque du medaillon, a la hauteur reelle du montant.
Part de la hauteur de contenu occupee par la liste. Controle positif : le disque a bien R=90,5 (deja mesure)."""
import math
from PIL import Image
C=Image.open("capture-1080x2400.png").convert('RGB'); pc=C.load(); print("OUVERT cap",C.size)
cx,cy,Rr=539.5,109.5,90.5
xs=[]
for y in range(40,115):
    for x in range(120,780):
        p=pc[x,y]
        if p[0]>150 and p[1]>110 and p[2]<140 and p[0]-p[2]>50: xs.append((x,y))
xm=max(x for x,y in xs); ys=[y for x,y in xs if x>xm-14]
print("  encre doree du montant : x max=%d, sur les lignes y=%d..%d"%(xm,min(ys),max(ys)))
for y in (min(ys),(min(ys)+max(ys))//2,max(ys)):
    dy=abs(y-cy)
    if dy<Rr:
        xl=cx-math.sqrt(Rr*Rr-dy*dy)
        print("     y=%d : bord gauche du disque x=%.1f  ->  jeu = %.1f px"%(y,xl,xl-xm))
    else:
        print("     y=%d : hors du disque"%y)
print()
print("  Part de la hauteur de contenu (145..2152 = 2007 px) :")
for lab,a,b in [("bande d'ornement (medaillon/losange)",145,232),("dm-tete",232,398),
                ("dm-glob",435,610),("titron + liste (jusqu'a la coupe)",645,1817),("dm-bas",1817,2152)]:
    print("     %-38s %4d..%4d = %4d px = %4.1f %%"%(lab,a,b,b-a,100.0*(b-a)/2007))
