#!/usr/bin/env python3
"""P6 — E01 ㊳ : la bande du bas du chrome (« ... attend vos ordres — trancher ») recouvre-t-elle
un element du chrome (anneau du manometre, losange) compare a un autre ecran ?

1) La bande elle-meme : on la CHERCHE dans les 4 planches de E01 (texte quelconque dans la moitie
   basse, hors dock). L'ecart assume n° 9 dit qu'elle est effacee avant chaque cliche.
2) A defaut, la seule chose mesurable : le chrome de E01 est-il INTACT compare a un autre ecran ?
   On compare pixel a pixel la bande de chrome HAUTE (anneau + losange) de E01 a celle de E03,
   E02, E05, E11 — memes valeurs de HUD (compte neuf), donc toute difference hors des zones de
   chiffres designe un recouvrement.
   Zones comparees, choisies pour ne contenir AUCUN chiffre : l'anneau du manometre (disque de
   rayon 110 px autour de son centre) et le losange sous lui.

Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : E03 vs E05 (deux ecrans qui ne sont pas E01) doivent rendre ~0 pixel different.
Controle negatif : on compare la zone du losange a une zone de DECOR -> doit rendre beaucoup de pixels differents.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

ANNEAU = (430, 0, 650, 220)     # manometre, aucun chiffre du HUD
LOSANGE = (505, 200, 575, 250)  # le petit losange d'or sous le manometre

def diff(a, b, box, seuil=8):
    n = 0; mx = 0
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            pa, pb = a.getpixel((x, y)), b.getpixel((x, y))
            d = max(abs(pa[c] - pb[c]) for c in range(3))
            if d > seuil:
                n += 1
            mx = max(mx, d)
    tot = (box[2] - box[0]) * (box[3] - box[1])
    return n, tot, mx

ECR = ["E01_Journal_1080x2400", "E01_Journal_bas_1080x2400", "E03_Chanedappro_1080x2400",
       "E02_Carnet_1080x2400", "E05_Loi_1080x2400", "E11_DecisionDetail_1080x2400"]
ims = {n: ouvrir("cap", n) for n in ECR}
ref = "E03_Chanedappro_1080x2400"
print("=== P6 (2) : le chrome de E01 est-il intact ? (contre E03) ===")
for n in ECR:
    if n == ref:
        continue
    a, t, m = diff(ims[ref], ims[n], ANNEAU)
    b, t2, m2 = diff(ims[ref], ims[n], LOSANGE)
    print(f"   {n:32s} anneau : {a}/{t} px differents ({100*a/t:.2f} %) ecart max={m}/255 | "
          f"losange : {b}/{t2} px ({100*b/t2:.2f} %) ecart max={m2}/255")

print()
print("=== CONTROLE POSITIF : E05 vs E02 (deux ecrans hors E01) ===")
a, t, m = diff(ims["E05_Loi_1080x2400"], ims["E02_Carnet_1080x2400"], ANNEAU)
print(f"   anneau : {a}/{t} px ({100*a/t:.2f} %) ecart max={m}/255")
print("=== CONTROLE NEGATIF : anneau de E03 compare a une zone de DECOR (meme taille) ===")
dec = (430, 300, 650, 520)
n = 0
for y in range(220):
    for x in range(220):
        pa = ims[ref].getpixel((ANNEAU[0] + x, ANNEAU[1] + y))
        pb = ims[ref].getpixel((dec[0] + x, dec[1] + y))
        if max(abs(pa[c] - pb[c]) for c in range(3)) > 8:
            n += 1
print(f"   {n}/48400 px differents ({100*n/48400:.1f} %) -> l'instrument discrimine")

print()
print("=== P6 (1) : y a-t-il une bande de texte en bas de E01, hors dock ? ===")
for n in ("E01_Journal_1080x2400", "E01_Journal_bas_1080x2400",
          "E01_Journal_1080x1920", "E01_Journal_bas_1080x1920"):
    im = ouvrir("cap", n)
    h = im.height
    box = (40, h - 480, 1040, h - 180)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    print(f"   {n}: fenetre={box} bandes de texte={[(box[1]+a, box[1]+b) for a, b in bs]}")
