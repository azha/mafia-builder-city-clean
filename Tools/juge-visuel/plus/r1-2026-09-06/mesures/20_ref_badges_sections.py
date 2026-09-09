#!/usr/bin/env python3
"""REFERENCE : badges dores, chevrons, carte mise en avant, intertitres, marges du panneau.
Controle positif : 3 badges attendus (3 / 5 / 2) — le masque or dans les cartes doit rendre 3 amas.
Controle negatif : le meme masque sur la carte 'Les inspections' (sans badge) doit rendre 0 amas."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
print(f"ouvre reference {R.size}")
rp=R.load(); W,H=R.size
def Lu(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def orb(c): return (c[0]-c[2])>60 and 90<Lu(c)<210
CART=[(548,677,'Le registre du matin'),(696,825,'La planche d ordres'),(843,972,'Les telegrammes'),
      (984,1151,'La chaufferie (mise en avant)'),(1234,1363,'Les inspections'),(1381,1510,'Les commissariats'),
      (1529,1658,'Le zinc'),(1748,1877,'Le coffre-fort'),(1896,2025,'Aide . A propos')]
print("\nbadge dore (masque or, x 800..1000) par carte :")
nb=0
for a,b,nom in CART:
    pts=[(x,y) for y in range(a,b) for x in range(800,1000) if orb(rp[x,y])]
    if pts:
        x0,x1=min(q[0] for q in pts),max(q[0] for q in pts); y0,y1=min(q[1] for q in pts),max(q[1] for q in pts)
        print(f"   {nom:30s} BADGE x {x0}..{x1} ({x1-x0+1} px) y {y0}..{y1} ({y1-y0+1} px) n={len(pts)}")
        nb+=1
    else:
        print(f"   {nom:30s} pas de badge")
print(f"   CONTROLE POSITIF : {nb} badges (attendu 3)")
print("\nmarges du panneau et des cartes (px et % de 1080) :")
print(f"   cartes  x 68..1012  -> marge G 68 = {100*68/1080:.2f} % ; marge D 67 = {100*67/1080:.2f} % ; largeur 945 = {100*945/1080:.2f} %")
print(f"   carte mise en avant x 61..1019 (halo) -> largeur 959 = {100*959/1080:.2f} %")
print("\nintertitres de section : 3 (CE QUI VOUS ATTEND / LA VILLE / LE COFFRE), hauteur de capitale ~18-20 px")
print("\nrythme des cartes : hauteurs et pas")
hs=[b-a+1 for a,b,_ in CART]; ps=[CART[i+1][0]-CART[i][0] for i in range(len(CART)-1)]
print(f"   hauteurs = {hs}")
print(f"   pas      = {ps}")
