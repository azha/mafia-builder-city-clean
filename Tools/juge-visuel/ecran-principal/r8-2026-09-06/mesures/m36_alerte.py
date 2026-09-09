# -*- coding: utf-8 -*-
"""m36 - le ruban `.bandeau-alerte` du canon (top:78px, 390 x 33.81, deux filets #ffffff14,
texte creme + gras or-vif). Sonde : encre claire dans la bande y 78..113, x 40..360.
CONTROLE DE CAPACITE : la meme sonde doit trouver le ruban dans le CANON."""
import sys, math; sys.path.insert(0,'.')
from commun import *
print("=== m36 : ruban d'alerte ===")
for cle in ['canon','j1920','j2400','d2400']:
    im,f=ouvrir(cle); px=im.load()
    P=[(xx/f,yy/f) for yy in range(int(78*f),int(113*f)) for xx in range(int(40*f),int(360*f)) if min(px[xx,yy])>=130]
    orv=[(xx/f,yy/f) for yy in range(int(78*f),int(113*f)) for xx in range(int(40*f),int(360*f))
         if dist_max(px[xx,yy],JETONS['or-vif'])<=50]
    if P:
        xs=[p[0] for p in P]; ys=[p[1] for p in P]
        print("   %-6s : %5d px d'encre claire ; x %.2f..%.2f ; y %.2f..%.2f ; %d px or-vif (le canon met `<b>` en or-vif)"
              %(cle,len(P),min(xs),max(xs),min(ys),max(ys),len(orv)))
    else:
        print("   %-6s : 0 px d'encre claire -> RIEN dans la bande"%cle)
    # filets horizontaux du ruban (#ffffff14 sur toute la largeur)
    lignes=[]
    for yy in range(int(78*f),int(113*f)):
        n=sum(1 for xx in range(int(60*f),int(340*f)) if L(px[xx,yy])-mediane([L(px[xx,yy+k]) for k in (-5,-4,4,5)])>=2.5)
        if n> int(200*f): lignes.append(yy/f)
    print("            filets horizontaux pleine largeur dans la bande : %s"%(("y="+", ".join("%.2f"%v for v in lignes)) if lignes else "aucun"))
