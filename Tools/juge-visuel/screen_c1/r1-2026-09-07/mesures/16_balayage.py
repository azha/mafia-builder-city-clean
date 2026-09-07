#!/usr/bin/env python3
"""Ou tombe le trait TEAL fige de `.elast::after` sur la REFERENCE, et coupe-t-il
du texte ? Un pixel est TEAL si B>R+18 et G>R+12 et L>35 (le jeton est #7fd4d9).
Controle positif : les chiffres des compteurs sont en #7fd4d9 -> la bande y=701..739
doit rendre du teal. Controle negatif : la bande du titre or doit rendre 0."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def teal(p): return p[2]>p[0]+18 and p[1]>p[0]+12 and lum(p)>35

f='reference-1080x2102.png'
im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
print(f"OUVERT {f} taille={W}x{H}")
print(f"  CONTROLE POSITIF chiffres compteurs y701..739 : "
      f"{sum(1 for y in range(701,740) for x in range(140,940) if teal(px[x,y]))} px teal (attendu >200)")
print(f"  CONTROLE NEGATIF titre or y513..573 : "
      f"{sum(1 for y in range(513,574) for x in range(300,780) if teal(px[x,y]))} px teal (attendu 0)")
print()
ELAST_TOP=825   # bord haut de .elast, mesure par 08_structure.py
print("  rangees teal DANS .elast (y 828..1866), x 100..960 :")
for y in range(828,1867):
    n=sum(1 for x in range(100,960) if teal(px[x,y]))
    if n>60:
        print(f"    y={y}  {n:4d} px teal   -> {y-ELAST_TOP:4d} px sous le haut de .elast "
              f"= {(y-ELAST_TOP)/3.6:5.1f} CSS")
print()
print("  bandes d'ENCRE du bloc heros (rappel de 11_typo2) : "
      "886-906 manchette | 926-928 filet | 957-998 h5-l1 | 1009-1041 h5-l2 | "
      "1066-1086 .cle | 1121-1135 chip")
print("  -> la rangee croisee par le trait est nommee dans le rapport.")
# couleur du trait au centre
for y in (1069,1072,1075):
    print(f"    couleur du trait a x=700, y={y} : {px[700,y]}")
# texte sous le trait : combien de px d'encre claire sur la rangee du trait
for y in (1066,1072,1080,1086):
    n=sum(1 for x in range(110,950) if lum(px[x,y])>70)
    print(f"    encre claire (L>70) sur y={y} : {n} px")
