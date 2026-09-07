#!/usr/bin/env python3
# 03 — la ligne de texte y=472..502 de la capture DEBORDE-T-ELLE du cadre ?
# On mesure l'etendue horizontale de l'encre et on regarde si elle touche x=0 et x=W-1.
# Controle positif : le titre "LA SEMAINE" (y 269..303), qui ne doit PAS toucher les bords.
# Controle negatif : le filet du bandeau (y=141), qui DOIT toucher les deux bords.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); W,H = im.size
print(f"OUVERT capture-1080x2400.png -> {W}x{H}")
px = im.load()
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def etendue(y0,y1,seuil=30,nom=''):
    fond = 13.0
    cols=[]
    for x in range(W):
        mx = max(lum(px[x,y]) for y in range(y0,y1+1))
        if mx - fond > seuil: cols.append(x)
    if not cols:
        print(f"  {nom:34s} y={y0}-{y1} : AUCUNE encre"); return None
    x0,x1 = cols[0], cols[-1]
    # colonnes d'encre contigues au bord ?
    touche_g = (x0 == 0); touche_d = (x1 == W-1)
    print(f"  {nom:34s} y={y0:4d}-{y1:4d} : encre x={x0}..{x1} (largeur {x1-x0+1} px = {100*(x1-x0+1)/W:.1f}% de l'ecran)  touche_gauche={touche_g} touche_droite={touche_d}  n_colonnes={len(cols)}")
    return x0,x1

print("-- controle negatif (DOIT toucher les deux bords) --")
etendue(140,143,seuil=8,nom='filet braise du bandeau')
print("-- controle positif (ne DOIT PAS toucher les bords) --")
etendue(269,303,nom='titre LA SEMAINE')
etendue(349,371,nom='sous-titre "Calm . None"')
print("-- sujet --")
etendue(472,502,nom='ligne "Au calme - aucune ..."')
print()
# combien de pixels d'encre sur la colonne 0 et la colonne W-1 dans la bande sujet ?
for x in [0,1,2,3,1076,1077,1078,1079]:
    v=[lum(px[x,y]) for y in range(472,503)]
    print(f"   colonne x={x:4d} : lum max={max(v):6.1f} (fond=13)")
