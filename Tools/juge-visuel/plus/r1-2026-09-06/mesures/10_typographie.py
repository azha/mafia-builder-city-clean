#!/usr/bin/env python3
"""Typographie : hauteur de CAPITALE et couleur de l'encre.
REF  : titre de carte, encre SOMBRE sur creme -> masque lum<110, fenetre x du 1er mot.
JEU  : libelle de rangee, encre CLAIRE sur ardoise -> masque lum>95.
Controle positif : la bbox d'encre doit tomber DANS la carte / DANS la rangee mesurees au 04/06.
Controle negatif : une fenetre de fond pur (sans texte) doit rendre une bbox vide."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"ouvre reference {R.size} / capture {C.size}")
rp,cp=R.load(),C.load()
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def bbox(px,x0,x1,y0,y1,test):
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if test(px[x,y])]
    if not pts: return None
    return (min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts))

print("\n[REF] titres de carte — 'L' initial isole (fenetre x 208..238)")
CARTES={'registre du matin':(548,677),'planche d ordres':(696,825),'telegrammes':(843,972),
        'inspections':(1234,1363),'commissariats':(1381,1510),'coffre-fort':(1748,1877)}
for nom,(a,b) in CARTES.items():
    bb=bbox(rp,208,240,a,b,lambda c:L(c)<110)
    print(f"   {nom:22s} bbox={bb}  hauteur capitale={bb[3]-bb[1]+1 if bb else None} px")
print("   CONTROLE NEGATIF fenetre de creme pur x 700..740 y 560..585 :",
      bbox(rp,700,740,560,585,lambda c:L(c)<110))

print("\n[REF] sous-titres (2e ligne) — fenetre x 208..1000, moitie basse de la carte")
for nom,(a,b) in list(CARTES.items())[:3]:
    mid=a+int((b-a)*0.55)
    bb=bbox(rp,208,1000,mid,b-6,lambda c:L(c)<130)
    print(f"   {nom:22s} bbox={bb} h={bb[3]-bb[1]+1 if bb else None}")

print("\n[REF] intertitres de section (LA VILLE / LE COFFRE / CE QUI VOUS ATTEND)")
for nom,(a,b) in {'CE QUI VOUS ATTEND':(480,520),'LA VILLE':(1160,1210),'LE COFFRE':(1670,1720)}.items():
    bb=bbox(rp,60,600,a,b,lambda c:c[0]>110 and c[0]-c[2]>25)
    print(f"   {nom:22s} bbox={bb}  h={bb[3]-bb[1]+1 if bb else None}")

print("\n[JEU] libelles de rangee (pleine largeur de rangee)")
RANGEES={'LA REPUTATION':(144,251),'LA REVUE DU JOUR':(266,374),'LA VENTE':(389,497),
         'LES INSPECTIONS':(634,742),'LE COMMISSARIAT':(757,865),'LA DISTRIBUTION':(2106,2214)}
for nom,(a,b) in RANGEES.items():
    bb=bbox(cp,0,1080,a,b,lambda c:L(c)>95)
    if bb:
        cx=(bb[0]+bb[2])//2
        print(f"   {nom:20s} bbox={bb} h={bb[3]-bb[1]+1} larg={bb[2]-bb[0]+1} centre_x={cx} (centre ecran=540)")
print("   CONTROLE NEGATIF fenetre d'ardoise pure x 20..60 y 300..340 :",
      bbox(cp,20,60,300,340,lambda c:L(c)>95))

print("\n[couleurs d'encre]")
print("   REF titre (echantillon le plus sombre de la fenetre) :",
      min((rp[x,y] for y in range(560,600) for x in range(210,520)), key=lambda c:L(c)))
print("   REF fond de carte (mediane fenetre creme)            :", rp[700,570])
print("   JEU libelle (echantillon le plus clair rangee 2)     :",
      max((cp[x,y] for y in range(300,345) for x in range(400,700)), key=lambda c:L(c)))
print("   JEU fond de rangee                                   :", cp[20,320])
