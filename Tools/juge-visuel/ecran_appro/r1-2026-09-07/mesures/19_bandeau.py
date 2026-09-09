# -*- coding: utf-8 -*-
"""BANDEAU de la capture : bbox du medaillon, bbox de la valeur ARGENT, chevauchement eventuel.
CONTROLE POSITIF : le medaillon doit etre trouve comme un disque centre sur x=540 (milieu de 1080).
CONTROLE NEGATIF : la meme sonde de 'braise' sur une bande de fond doit rendre aucun pixel."""
from PIL import Image
CAP="../capture-1080x2400.png"
im=Image.open(CAP).convert("RGB"); W,H=im.size; px=im.load(); print("OUVERT",CAP,(W,H))
# anneau braise du medaillon : pixels proches de (224,102,74)
pts=[(x,y) for y in range(0,220) for x in range(0,W)
     if abs(px[x,y][0]-224)<45 and abs(px[x,y][1]-102)<45 and abs(px[x,y][2]-74)<45 and y not in (141,142)]
xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
print("  anneau du medaillon : x=%d..%d y=%d..%d  centre x=%.1f  diametre=%d px"
      %(min(xs),max(xs),min(ys),max(ys),(min(xs)+max(xs))/2,max(xs)-min(xs)+1))
# valeur ARGENT : encre doree a gauche
def encre_cols(y0,y1,x0,x1,fond=(13,18,27),seuil=40):
    cols=[x for x in range(x0,x1) if any(max(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil for y in range(y0,y1))]
    return cols
c=encre_cols(45,110,0,470)
print("  valeur ARGENT (encre entre y=45 et 110) : x=%d..%d"%(min(c),max(c)))
gauche_med=min(xs)
print("  bord gauche de l'anneau du medaillon : x=%d"%gauche_med)
print("  ecart valeur -> medaillon : %d px  -> %s"%(gauche_med-max(c),
      "CHEVAUCHEMENT" if gauche_med-max(c)<0 else ("CONTACT (<12 px)" if gauche_med-max(c)<12 else "degage")))
# pixels de la valeur qui tombent DANS le disque du medaillon
cx=(min(xs)+max(xs))/2; cy=(min(ys)+max(ys))/2; R=(max(xs)-min(xs)+1)/2
dedans=0
for y in range(45,110):
    for x in range(300,470):
        if max(abs(px[x,y][i]-(13,18,27)[i]) for i in range(3))>40:
            if (x-cx)**2+(y-cy)**2 <= R*R: dedans+=1
print("  pixels d'encre de la valeur ARGENT tombant DANS le disque du medaillon : %d"%dedans)
neg=[(x,y) for y in range(1600,1700) for x in range(0,W,4)
     if abs(px[x,y][0]-224)<45 and abs(px[x,y][1]-102)<45 and abs(px[x,y][2]-74)<45]
print("  CONTROLE NEGATIF (sonde braise sur y1600..1700) : %d pixel(s)"%len(neg))
