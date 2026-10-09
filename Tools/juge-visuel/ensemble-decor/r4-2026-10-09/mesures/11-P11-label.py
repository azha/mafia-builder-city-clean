#!/usr/bin/env python3
"""P11 (suite) — le label « D'OU CA PART » lui-meme : hauteur de capitale et interlettrage,
mesures prises sur les 4 DERNIERES lettres « P A R T » — toutes des capitales a sommet PLAT,
sans accent ni cedille : la hauteur mesuree est donc la vraie hauteur de capitale, pas la
hauteur de l'accent de « U ».  (La mesure globale du label rend 22 px parce que l'accent de
« U » et la cedille de « C » debordent : ce chiffre-la ne compare pas deux polices.)

Bandes lues au profil : reference y=770..794 ; capture 2400 y=853..874 ; capture 1920 y=752..774.
Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : les 4 lettres doivent rendre la MEME hauteur a +-1 px dans chaque image.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

CAS = [
    ("ref", "E04-cadre-54",               (100, 768, 400, 798)),
    ("cap", "E04_Distribution_1080x2400", (380, 850, 700, 878)),
    ("cap", "E04_Distribution_1080x1920", (380, 750, 700, 778)),
]
for kind, nom, box in CAS:
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    a, b = bs[0]
    ls = [l for l in lettres(bits, W, a, b) if l[1] - l[0] + 1 >= 3]
    print(f"   {nom}  fenetre={box} fond={f}  bande y={box[1]+a}..{box[1]+b}  {len(ls)} lettres")
    noms = "D ' O U C A P A R T".split()
    for i, l in enumerate(ls):
        h = l[3] - l[2] + 1
        print(f"      lettre {i}: x={box[0]+l[0]:4d}..{box[0]+l[1]:4d} ({l[1]-l[0]+1:2d}px) "
              f"y={box[1]+l[2]}..{box[1]+l[3]} h={h:2d}px ({h/K:4.2f} css)")
    q = ls[-4:]
    hs = [l[3] - l[2] + 1 for l in q]
    ecarts = [q[j + 1][0] - q[j][1] - 1 for j in range(3)]
    print(f"      « P A R T » hauteurs={hs}  -> capitale = {max(set(hs), key=hs.count)}px "
          f"= {max(set(hs), key=hs.count)/K:.2f} css   interlettres={ecarts}px "
          f"= {[round(e/K, 2) for e in ecarts]} css")
    print(f"      CONTROLE POSITIF : les 4 hauteurs tiennent-elles a +-1 px ? "
          + ("OUI" if max(hs) - min(hs) <= 1 else "NON " + str(hs)))
