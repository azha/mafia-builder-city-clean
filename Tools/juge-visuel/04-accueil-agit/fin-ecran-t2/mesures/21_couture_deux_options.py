#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""21 — LA COUTURE entre les deux options : ou passe le vide qui separe l'option gauche de l'option
droite, a la hauteur des BOUTONS puis a la hauteur des CONSEQUENCES. Dans la maquette la couture
est la meme aux deux etages (le bloc « conseq. » est sous SON bouton) ; on mesure l'ecart.

Methode : pour chaque etage, on prend la plus longue plage de colonnes SANS encre entre x=200 et
x=900 — c'est la gouttiere. On rend son centre et sa largeur.

Contrôle POSITIF  — dans la REFERENCE, les deux coutures doivent coincider a quelques px.
Contrôle NEGATIF — une bande choisie DANS un bouton (pleine) ne doit rendre aucune gouttiere large.
Sortie : une image annotee dans le scratchpad (traits magenta = couture des boutons,
cyan = couture des consequences).
"""
import os
from PIL import Image, ImageDraw

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
OUT = "/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/12bb723c-e30b-4127-8b2d-58b0fa9e44d9/scratchpad"
ECH = 3.6


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def gouttiere(path, nom, y0, y1, seuil=95, x0=200, x1=900):
    im = Image.open(path)
    px = im.convert("RGB").load()
    vide = []
    for x in range(x0, x1):
        encre = any(lum(px[x, y]) > seuil for y in range(y0, y1))
        vide.append(0 if encre else 1)
    best = (0, -1, -1)
    cur = 0
    deb = -1
    for i, v in enumerate(vide):
        if v:
            if cur == 0:
                deb = i
            cur += 1
            if cur > best[0]:
                best = (cur, deb, i)
        else:
            cur = 0
    if best[0] == 0:
        print("    %-38s aucune gouttiere (bande pleine)" % nom)
        return None
    a, b = x0 + best[1], x0 + best[2]
    print("    %-38s gouttiere x=[%4d..%4d]  largeur=%3d px (%5.2f CSS)  CENTRE=%6.1f   [%s %s]" %
          (nom, a, b, b - a + 1, (b - a + 1) / ECH, (a + b) / 2.0, os.path.basename(path)[:24], im.size))
    return (a, b)


R5 = os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png")
H01 = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x2400.png")
H01b = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x1920.png")

print(">>> CONTROLE NEGATIF — bande prise A L'INTERIEUR du bouton dore (doit etre pleine)")
gouttiere(R5, "ref c5  dans le bouton dore", 1200, 1230, x0=120, x1=500)
gouttiere(H01, "cap H01 dans le bouton dore", 1620, 1650, x0=120, x1=490)

print()
print(">>> ETAGE 'BOUTONS'")
b_ref = gouttiere(R5, "ref c5  couture des boutons", 1145, 1272)
b_cap = gouttiere(H01, "cap H01 couture des boutons", 1578, 1699)
b_cap19 = gouttiere(H01b, "cap H01 1920 couture boutons", 1098, 1219)

print()
print(">>> ETAGE 'CONSEQUENCES'")
c_ref = gouttiere(R5, "ref c5  couture des consequences", 1290, 1460)
c_cap = gouttiere(H01, "cap H01 couture des consequences", 1735, 1870)
c_cap19 = gouttiere(H01b, "cap H01 1920 couture conseq.", 1255, 1390)

print()
print(">>> DECALAGE entre les deux coutures (ce qu'un joueur lit comme « sous quelle option ? »)")
for nom, bb, cc in (("reference cadre 5", b_ref, c_ref), ("capture H01 2400", b_cap, c_cap),
                    ("capture H01 1920", b_cap19, c_cap19)):
    if bb and cc:
        d = ((cc[0] + cc[1]) / 2.0) - ((bb[0] + bb[1]) / 2.0)
        print("    %-22s  couture boutons=%6.1f   couture consequences=%6.1f   DECALAGE=%+7.1f px (%+6.2f CSS, %+5.2f %% de la largeur d'ecran)" %
              (nom, (bb[0] + bb[1]) / 2.0, (cc[0] + cc[1]) / 2.0, d, d / ECH, 100.0 * d / 1080))

# image annotee
os.makedirs(OUT, exist_ok=True)
for path, nom, y0, y1, bb, cc in ((R5, "couture_ref_c5.png", 1100, 1480, b_ref, c_ref),
                                  (H01, "couture_cap_H01.png", 1540, 1890, b_cap, c_cap)):
    im = Image.open(path).convert("RGB").crop((0, y0, 1080, y1))
    d = ImageDraw.Draw(im)
    if bb:
        for x in bb:
            d.line([(x, 0), (x, y1 - y0)], fill=(255, 0, 255), width=2)
    if cc:
        for x in cc:
            d.line([(x, 0), (x, y1 - y0)], fill=(0, 255, 255), width=2)
    p = os.path.join(OUT, nom)
    im.save(p)
    print("    annote -> %s %s" % (p, im.size))
