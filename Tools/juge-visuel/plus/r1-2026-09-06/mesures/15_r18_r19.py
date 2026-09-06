#!/usr/bin/env python3
"""r18 'LA LOI' et r19 (derniere) : fenetres SERREES (le 14 attrapait les libelles du dock).
Seuil de luminance abaisse a 60 pour r19 : le voile du dock l'assombrit (mesure du voile jointe).
Controle positif : au seuil 60, 'LA VENTE' (r3, non voilee) doit garder la meme largeur (111 px).
Controle negatif : une fenetre de fond voile (x 60..160, y 2380..2399) doit rendre 0 px."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(D,'capture-1080x2400.png')
im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
print(f"ouvre {os.path.basename(p)} taille={im.size}")
def Lu(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def bb(x0,x1,y0,y1,s):
    pts=[(x,y) for y in range(y0,min(y1,H)) for x in range(x0,x1) if Lu(px[x,y])>s and (px[x,y][0]-px[x,y][2])>12]
    if not pts: return None
    return (min(q[0] for q in pts),min(q[1] for q in pts),max(q[0] for q in pts),max(q[1] for q in pts),len(pts))
print("CONTROLE POSITIF r3 'LA VENTE' au seuil 60 :", bb(0,W,389,497,60))
print("CONTROLE NEGATIF fond voile x60..160 y2380..2399 :", bb(60,160,2380,2399,60))
print()
r=bb(300,780,2265,2305,90); print(" r18 'LA LOI' (x300..780, y2265..2305, seuil 90) :",r)
if r: print(f"    larg={r[2]-r[0]+1} px ; centre_x={(r[0]+r[2])/2:.1f} ; bord DROIT de l'encre x={r[2]}")
r2=bb(300,780,2380,2400,60); print(" r19 (x300..780, y2380..2399, seuil 60)          :",r2)
if r2: print(f"    larg={r2[2]-r2[0]+1} px ; y {r2[1]}..{r2[3]} -> {r2[3]-r2[1]+1} px d'encre visibles (capitale pleine mesuree ailleurs = 18 px)")
print()
print("[bord gauche des pastilles a la hauteur du texte de r18]")
def pastille(c): return (c[2]-c[0])>14 and Lu(c)>18
for y in (2274,2283,2292):
    on=[x for x in range(500,760) if pastille(px[x,y])]
    print(f"   y={y} : 1er x de pastille a droite du centre = {min(on) if on else None}")
print()
print("[voile du dock] meme aplat de rangee mesure hors dock vs sous dock :")
print("   rangee 5 (hors dock) x=20 y=700 :", px[20,700])
print("   rangee 18 (sous dock) x=20 y=2280:", px[20,2280])
print("   rangee 19 (sous dock) x=20 y=2390:", px[20,2390])
