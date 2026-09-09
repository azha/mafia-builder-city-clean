#!/usr/bin/env python3
"""(a) Collision chrome/contenu en haut : bas du medaillon du manometre vs 1re rangee et son libelle.
   (b) Indice de defilement : y a-t-il une barre/poignee sur les bords de la zone de contenu ?
Instrument (a) : le medaillon a un cerclage OR ; masque R-B>45 et lum>60, borne basse cherchee.
Instrument (b) : ecart-type par colonne sur les 24 px de bord (gauche et droit), zone y 300..2100.
Controle positif (a) : le masque or doit retrouver le liseré de bandeau a y 138..143 (deja mesure).
Controle positif (b) : la meme sonde sur la colonne du CENTRE (x 540) doit donner un ecart-type ELEVE
                       (le texte y varie) — sinon la sonde ne discrimine rien."""
import os, statistics
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(D,'capture-1080x2400.png')
im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
print(f"ouvre {os.path.basename(p)} taille={im.size}")
def Lu(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def orr(c): return (c[0]-c[2])>45 and Lu(c)>60
ys=[y for y in range(0,320) if sum(1 for x in range(W) if orr(px[x,y]))>0]
print("CONTROLE POSITIF liseré de bandeau present dans le masque or :", 138 in ys and 142 in ys)
# medaillon : masque or dans la fenetre centrale seulement
cen=[y for y in range(0,320) if sum(1 for x in range(400,680) if orr(px[x,y]))>3]
print(f"(a) medaillon (masque or, x 400..680) : y {min(cen)}..{max(cen)}  -> bord bas = {max(cen)}")
print(f"    bas du bandeau (liseré) = 143 ; 1re rangee = 144..251 ; libelle 'LA REPUTATION' encre y :")
pts=[(x,y) for y in range(144,252) for x in range(380,700) if Lu(px[x,y])>95 and (px[x,y][0]-px[x,y][2])>20]
print(f"      x {min(q[0] for q in pts)}..{max(q[0] for q in pts)}  y {min(q[1] for q in pts)}..{max(q[1] for q in pts)}")
print(f"    => le medaillon descend {max(cen)-143} px SOUS le bandeau, dans la 1re rangee")
print()
print("(b) indice de defilement — ecart-type de luminance par colonne, y 300..2090")
for nom,x0,x1 in (('bord gauche 0..24',0,24),('bord droit 1056..1080',1056,1080),('centre 528..552 (controle +)',528,552)):
    vals=[]
    for x in range(x0,x1):
        col=[Lu(px[x,y]) for y in range(300,2090,3)]
        vals.append(statistics.pstdev(col))
    print(f"    {nom:32s} ecart-type max sur les colonnes = {max(vals):6.2f}")
