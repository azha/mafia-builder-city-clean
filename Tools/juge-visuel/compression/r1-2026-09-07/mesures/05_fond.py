#!/usr/bin/env python3
# 05 — le FOND : la capture a-t-elle perdu le bleu nuit des maquettes ?
#      On echantillonne la mediane d'une fenetre 41x41 loin de toute encre.
# Controle positif : le bandeau de la CAPTURE elle-meme (y~60) doit ressortir BLEUTE (B > R).
# Controle negatif : si tout ressortait neutre, l'instrument mesurerait autre chose.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def medfen(px, cx, cy, r=20):
    R=[];G=[];B=[]
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            p=px[x,y]; R.append(p[0]);G.append(p[1]);B.append(p[2])
    R.sort();G.sort();B.sort();m=len(R)//2
    return (R[m],G[m],B[m])

def dump(f, pts):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size
    print(f"  OUVERT {f} -> {W}x{H}")
    px=im.load()
    for (cx,cy,nom) in pts:
        c=medfen(px,cx,cy)
        print(f"    {nom:44s} ({cx:4d},{cy:4d}) = {c}   B-R={c[2]-c[0]:+3d}  G-R={c[1]-c[0]:+3d}")

print("=== CAPTURE (1080x2400) ===")
dump('capture-1080x2400.png', [
 (150,  60,'CONTROLE + : bandeau du shell (bleu attendu)'),
 (150, 400,'zone de contenu, haut (sous le sous-titre)'),
 (540, 700,'zone de contenu, milieu-haut'),
 (540,1200,'zone de contenu, milieu'),
 (540,1800,'zone de contenu, bas'),
 (120,2100,'zone de contenu, juste au-dessus du dock'),
 (540,2370,"plaque du dock"),
])
print("=== v4-29 (900x1752, homologue serie 4 'au calme') ===")
dump('etats/v4-29.png', [
 (450, 250,'derriere le manometre'),
 (100, 700,'decor a gauche du cadran'),
 (450,1200,'decor (quai)'),
 (450,1650,'decor (eau), bas'),
])
print("=== canon serie 2 'aucune semaine' (900x1752) ===")
dump('etats/ecran-canon-vide.png', [
 (450, 900,'fond nu, sous la plaque'),
 (150,1500,'fond nu, bas'),
 (700, 830,'fond nu, milieu droite'),
 (450, 250,'fond derriere l en-tete'),
])
print("=== canon HUD 1176 (temoin du chrome) ===")
dump('hud-canon-1176.png', [
 (160,  60,'bandeau du canon HUD'),
])
