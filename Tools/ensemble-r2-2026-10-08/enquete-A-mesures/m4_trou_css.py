#!/usr/bin/env python3
"""m4 — TROU D'ENCRE (F1, F5) refait, avec ses controles.
Meme definition que 04 du juge (ligne sans encre : < 0,4 % de pixels a plus de 40/255 de la mediane de la ligne), mais
 (1) la hauteur est donnee en px CSS (1 px CSS = 3,6 px image des deux cotes) ET en % de la hauteur du CORPS (entre le haut du
     premier objet et le dock), pas seulement en % de H ;
 (2) controle SYNTHETIQUE (le controle 'E10' du juge ne separait pas : 0,5 %) : une image 1080x2400 avec grain +-7 et deux blocs d'encre
     separes par exactement 600 px DOIT rendre 600 ;
 (3) les DEUX resolutions du jeu.
Imprime la taille de chaque image lue."""
from PIL import Image
import random, statistics, os
REF="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference/"
CAP="/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final/"
def enc_profile(im,xg=10,xd=1070):
    px=im.load(); W,H=im.size; out=[]
    for y in range(H):
        ech=[px[x,y] for x in range(xg,xd,3)]
        med=tuple(statistics.median([c[k] for c in ech]) for k in range(3))
        out.append(sum(1 for c in ech if max(abs(c[k]-med[k]) for k in range(3))>40)/len(ech))
    return out
def plus_grand_trou(enc,y0,y1):
    best=cur=by=0
    for y in range(y0,y1):
        if enc[y]<0.004:
            cur+=1
            if cur>best: best,by=cur,y-cur+1
        else: cur=0
    return best,by
# controle synthetique
random.seed(1)
im=Image.new("RGB",(1080,2400)); px=im.load()
for y in range(2400):
    for x in range(1080):
        n=random.randint(-7,7); px[x,y]=(110+n,80+n,40+n)
for y in list(range(200,500))+list(range(1100,1400))+list(range(1900,2200)):
    for x in range(100,900): px[x,y]=(240,230,200)
enc=enc_profile(im); n,by=plus_grand_trou(enc,0,2400)
print(f"CONTROLE synthetique (le plus grand vide attendu : 600 px, y=500..1100 ; autres : 0-200, 1400-1900=500, 2200-2400) : trou = {n} px, y={by}  -> {'OK' if n==600 else 'ECHEC'}")
def mesure(path,y0f,y1f,label):
    im=Image.open(path).convert("RGB"); W,H=im.size
    enc=enc_profile(im); n,by=plus_grand_trou(enc,int(H*y0f),int(H*y1f))
    print(f"{label:34s} {W}x{H:<5d} trou = {n:4d} px = {n/3.6:5.0f} px CSS = {100*n/H:4.1f} % de H   (y={by}..{by+n})")
    return n
mesure(REF+"E09-cadre-31-tableau.png",0.11,0.99,"REF c31 (tableau)")
mesure(REF+"E09-cadre-33-signalement.png",0.30,0.99,"REF c33 (signalement)")
mesure(REF+"E09-cadre-34-retour-de-baton.png",0.30,0.99,"REF c34 (retour de baton)")
mesure(CAP+"E09_Inspections_1080x2400.png",0.09,0.97,"JEU E09 2400")
mesure(CAP+"E09_Inspections_1080x1920.png",0.09,0.97,"JEU E09 1920")
mesure(REF+"E04-cadre-54.png",0.21,0.99,"REF c54")
mesure(CAP+"E04_Distribution_1080x2400.png",0.18,0.97,"JEU E04 2400 (sans geste)")
mesure(CAP+"E04_Distribution_1080x1920.png",0.18,0.97,"JEU E04 1920 (avec geste)")
